import { Deferred, Effect, Fiber, Stream } from "effect"
import { expect, test } from "vitest"
import type { Bit, Bits } from "@guess/core"
import { Unavailable } from "@guess/guesser-domain"
import type { GuessFailed, GuessGateway } from "@guess/guesser-domain"
import {
  GuessState,
  makeObserveGuessStatus,
  makeObserveWindowSize,
  makeRequestGuess,
  makeSetWindowSize,
  makeTakeGuess,
  ObserveGuessStatus,
  ObserveWindowSize,
  RequestGuess,
  SetWindowSize,
  TakeGuess,
} from "./index.ts"
import type { GuessStatus } from "./index.ts"
import { makeMemoryWindowSizeRepository } from "./test-support.ts"

const fixed = (bit: Bit): GuessGateway => ({ guess: () => Effect.succeed({ bit }) })
const failing = (error: GuessFailed): GuessGateway => ({ guess: () => Effect.fail(error) })
const slow = (gates: Array<Deferred.Deferred<Bit>>): GuessGateway => {
  let i = 0
  return {
    guess: () => {
      const gate = gates[i++]!
      return Deferred.await(gate).pipe(Effect.map((bit) => ({ bit })))
    },
  }
}

type WindowSizeRepository = ReturnType<typeof makeMemoryWindowSizeRepository>

const setup = (gateway: GuessGateway, windowSizeRepository: WindowSizeRepository = makeMemoryWindowSizeRepository()) =>
  Effect.gen(function*() {
    const guessState = yield* GuessState
    const requestGuess = makeRequestGuess({ guessState, gateway })
    return {
      requestGuess,
      takeGuess: makeTakeGuess({ guessState }),
      setWindowSize: makeSetWindowSize({ guessState, windowSizeRepository, gateway }),
      status: makeObserveGuessStatus({ guessState }),
      windowSize: makeObserveWindowSize({ guessState }),
    }
  })

const run = <A>(
  effect: Effect.Effect<A, never, GuessState>,
  windowSizeRepository: WindowSizeRepository = makeMemoryWindowSizeRepository(),
) => Effect.runPromise(effect.pipe(Effect.scoped, Effect.provide(GuessState.layer({ windowSizeRepository }))))

const first = <A>(stream: Stream.Stream<A>) =>
  Stream.runHead(stream).pipe(Effect.map((o) => (o._tag === "Some" ? o.value : undefined)))

const current = (app: { readonly status: ReturnType<typeof makeObserveGuessStatus> }) =>
  first(app.status(new ObserveGuessStatus()))

const settle = Effect.sleep("5 millis")
const bits = (...b: Array<Bit>): Bits => b

test("status starts Idle", () =>
  run(Effect.gen(function*() {
    const app = yield* setup(fixed(1))
    expect(yield* current(app)).toEqual({ _tag: "Idle" })
  })))

test("RequestGuess goes Thinking then Ready; TakeGuess returns the guess and resets to Idle", () =>
  run(Effect.gen(function*() {
    const gate = yield* Deferred.make<Bit>()
    const app = yield* setup(slow([gate]))
    yield* app.requestGuess(new RequestGuess({ bits: bits(0, 1) }))
    expect(yield* current(app)).toEqual({ _tag: "Thinking" })
    yield* Deferred.succeed(gate, 1)
    yield* settle
    expect(yield* current(app)).toEqual({ _tag: "Ready" })
    expect(yield* app.takeGuess(new TakeGuess())).toEqual({ bit: 1 })
    expect(yield* current(app)).toEqual({ _tag: "Idle" })
  })))

test("TakeGuess when not ready returns null and keeps the state", () =>
  run(Effect.gen(function*() {
    const gate = yield* Deferred.make<Bit>()
    const app = yield* setup(slow([gate]))
    expect(yield* app.takeGuess(new TakeGuess())).toBeNull()
    yield* app.requestGuess(new RequestGuess({ bits: bits(1) }))
    expect(yield* app.takeGuess(new TakeGuess())).toBeNull()
    expect(yield* current(app)).toEqual({ _tag: "Thinking" })
  })))

test("failure becomes Failed", () =>
  run(Effect.gen(function*() {
    const app = yield* setup(failing(new Unavailable({ message: "down" })))
    yield* app.requestGuess(new RequestGuess({ bits: bits(1) }))
    yield* settle
    expect(yield* current(app)).toEqual({ _tag: "Failed", reason: "Unavailable", message: "down" })
  })))

test("status never contains the bit", () =>
  run(Effect.gen(function*() {
    const app = yield* setup(fixed(1))
    const seen: Array<GuessStatus> = []
    const fiber = yield* Effect.forkChild(
      Stream.runForEach(app.status(new ObserveGuessStatus()), (s) => Effect.sync(() => void seen.push(s))),
    )
    yield* settle
    yield* app.requestGuess(new RequestGuess({ bits: bits(0, 1) }))
    yield* settle
    yield* app.takeGuess(new TakeGuess())
    yield* settle
    yield* Fiber.interrupt(fiber)
    expect(seen.map((s) => s._tag)).toEqual(["Idle", "Thinking", "Ready", "Idle"])
    for (const s of seen) expect(s).not.toHaveProperty("bit")
  })))

test("a new RequestGuess interrupts the old one", () =>
  run(Effect.gen(function*() {
    const g1 = yield* Deferred.make<Bit>()
    const g2 = yield* Deferred.make<Bit>()
    const app = yield* setup(slow([g1, g2]))
    yield* app.requestGuess(new RequestGuess({ bits: bits(0) }))
    yield* settle
    yield* app.requestGuess(new RequestGuess({ bits: bits(0, 1) }))
    yield* settle
    yield* Deferred.succeed(g1, 0)
    yield* settle
    expect(yield* current(app)).toEqual({ _tag: "Thinking" })
    yield* Deferred.succeed(g2, 1)
    yield* settle
    expect(yield* app.takeGuess(new TakeGuess())).toEqual({ bit: 1 })
  })))

test("an empty RequestGuess interrupts a running guess", () =>
  run(Effect.gen(function*() {
    const gate = yield* Deferred.make<Bit>()
    const app = yield* setup(slow([gate]))
    yield* app.requestGuess(new RequestGuess({ bits: bits(1) }))
    yield* settle
    yield* app.requestGuess(new RequestGuess({ bits: bits() }))
    yield* Deferred.succeed(gate, 1)
    yield* settle
    expect(yield* current(app)).toEqual({ _tag: "Idle" })
  })))

test("the gateway gets lastN(bits, N)", () =>
  run(Effect.gen(function*() {
    const seen: Array<Bits> = []
    const gateway: GuessGateway = {
      guess: (b) => Effect.sync(() => (seen.push(b), { bit: 0 as Bit })),
    }
    const app = yield* setup(gateway)
    yield* app.setWindowSize(new SetWindowSize({ n: 3 }))
    yield* app.requestGuess(new RequestGuess({ bits: bits(0, 1, 1, 0, 1) }))
    yield* settle
    expect(seen).toEqual([[1, 0, 1]])
  })))

test("SetWindowSize clamps and saves", () => {
  const repository = makeMemoryWindowSizeRepository()
  return run(Effect.gen(function*() {
    const app = yield* setup(fixed(1), repository)
    const size = () => first(app.windowSize(new ObserveWindowSize()))
    yield* app.setWindowSize(new SetWindowSize({ n: 0 }))
    expect(yield* size()).toBe(1)
    yield* app.setWindowSize(new SetWindowSize({ n: 300 }))
    expect(yield* size()).toBe(256)
    yield* app.setWindowSize(new SetWindowSize({ n: 2.6 }))
    expect(yield* size()).toBe(3)
    expect(repository.saved()).toBe(3)
    yield* app.setWindowSize(new SetWindowSize({ n: NaN }))
    expect(yield* size()).toBe(3)
    expect(repository.saved()).toBe(3)
  }), repository)
})

test("SetWindowSize with NaN changes nothing and saves nothing", () => {
  const repository = makeMemoryWindowSizeRepository(7)
  return run(Effect.gen(function*() {
    const app = yield* setup(fixed(1), repository)
    yield* app.setWindowSize(new SetWindowSize({ n: NaN }))
    expect(yield* first(app.windowSize(new ObserveWindowSize()))).toBe(7)
    expect(repository.saved()).toBe(7)
  }), repository)
})

test("SetWindowSize requests a new guess", () =>
  run(Effect.gen(function*() {
    const gates = [yield* Deferred.make<Bit>(), yield* Deferred.make<Bit>()]
    const app = yield* setup(slow(gates))
    yield* app.requestGuess(new RequestGuess({ bits: bits(0, 1) }))
    yield* Deferred.succeed(gates[0]!, 1)
    yield* settle
    expect(yield* current(app)).toEqual({ _tag: "Ready" })
    yield* app.setWindowSize(new SetWindowSize({ n: 5 }))
    expect(yield* current(app)).toEqual({ _tag: "Thinking" })
  })))

test("the window size survives a new layer", async () => {
  const repository = makeMemoryWindowSizeRepository()
  await run(Effect.gen(function*() {
    const app = yield* setup(fixed(1), repository)
    yield* app.setWindowSize(new SetWindowSize({ n: 10 }))
  }), repository)
  const size = await run(Effect.gen(function*() {
    const app = yield* setup(fixed(1), repository)
    return yield* first(app.windowSize(new ObserveWindowSize()))
  }), repository)
  expect(size).toBe(10)
})

test("leaving the layer scope interrupts a running guess", async () => {
  let interrupted = false
  const gateway: GuessGateway = {
    guess: () => Effect.never.pipe(Effect.onInterrupt(() => Effect.sync(() => void (interrupted = true)))),
  }
  await run(Effect.gen(function*() {
    const app = yield* setup(gateway)
    yield* app.requestGuess(new RequestGuess({ bits: bits(1) }))
    yield* settle
  }))
  expect(interrupted).toBe(true)
})

test("concurrent requests and SetWindowSize end with the newest bits", () =>
  run(Effect.gen(function*() {
    const calls: Array<Bits> = []
    const gateway: GuessGateway = {
      // Sleeps, so a running guess makes the next request wait in FiberHandle.clear.
      guess: (b) => Effect.sleep("2 millis").pipe(Effect.map(() => (calls.push(b), { bit: 1 as Bit }))),
    }
    const app = yield* setup(gateway)
    yield* app.requestGuess(new RequestGuess({ bits: bits(1) }))
    yield* Effect.all([
      app.requestGuess(new RequestGuess({ bits: bits(0, 1) })),
      app.setWindowSize(new SetWindowSize({ n: 2 })),
      app.requestGuess(new RequestGuess({ bits: bits(0, 1, 1) })),
    ], { concurrency: "unbounded" })
    yield* Effect.sleep("30 millis")

    expect(calls.at(-1)).toEqual([1, 1])
    expect(yield* current(app)).toEqual({ _tag: "Ready" })
  })))
