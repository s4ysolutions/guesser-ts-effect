import { Deferred, Effect, Fiber, Layer, Stream, SubscriptionRef } from "effect"
import { beforeEach, expect, test } from "vitest"
import type { Bit, Bits } from "@guess/core"
import type { GuessGateway } from "@guess/guesser-application"
import {
  GuessState,
  makeObserveGuessStatus,
  makeRequestGuess,
  makeTakeGuess,
  ObserveGuessStatus,
} from "@guess/guesser-application"
import { makeRound } from "@guess/interaction-domain"
import type { Rounds } from "@guess/interaction-domain"
import {
  makePressBit,
  makeResetRounds,
  makeResumeGame,
  PressBit,
  ResetRounds,
  ResumeGame,
  RoundsState,
} from "./index.ts"
import { makeMemoryRoundsRepository } from "./test-support.ts"

beforeEach(() => localStorage.clear())

const fixed = (bit: Bit, calls: Array<Bits> = []): GuessGateway => ({
  guess: (b) => Effect.sync(() => (calls.push(b), { bit })),
})

// Gate i answers the i-th call. Every call's bits are recorded when the call is made.
const slow = (gates: Array<Deferred.Deferred<Bit>>, calls: Array<Bits> = []): GuessGateway => {
  let i = 0
  return {
    guess: (b) => {
      calls.push(b)
      const gate = gates[i++]!
      return Deferred.await(gate).pipe(Effect.map((bit) => ({ bit })))
    },
  }
}

const settle = Effect.sleep("5 millis")
const first = <A>(stream: Stream.Stream<A>) =>
  Stream.runHead(stream).pipe(Effect.map((o) => (o._tag === "Some" ? o.value : undefined)))

type Repository = ReturnType<typeof makeMemoryRoundsRepository>

// Yields before every save, so other fibers can run between a command's steps.
const makeSlowSaveRepository = (): Repository => {
  const inner = makeMemoryRoundsRepository()
  return {
    ...inner,
    save: (rounds) => Effect.yieldNow.pipe(Effect.andThen(inner.save(rounds))),
  }
}

// Builds the use cases on the same repository the layer loads from.
const makeApp = (deps: {
  readonly guessState: GuessState["Service"]
  readonly roundsState: RoundsState["Service"]
  readonly repository: Repository
  readonly gateway: GuessGateway
}) => {
  const { guessState, roundsState, repository } = deps
  const requestGuess = makeRequestGuess({ guessState, gateway: deps.gateway })
  const takeGuess = makeTakeGuess({ guessState })
  const observeStatus = makeObserveGuessStatus({ guessState })
  return {
    press: makePressBit({ roundsState, repository, takeGuess, requestGuess }),
    reset: makeResetRounds({ roundsState, repository, requestGuess }),
    resume: makeResumeGame({ roundsState, requestGuess }),
    status: () => first(observeStatus(new ObserveGuessStatus())),
    rounds: () => SubscriptionRef.get(roundsState.rounds),
  }
}

type App = ReturnType<typeof makeApp>

const withApp = <A>(
  repository: Repository,
  gateway: GuessGateway,
  body: (app: App) => Effect.Effect<A>,
) =>
  Effect.gen(function*() {
    const app = makeApp({
      guessState: yield* GuessState,
      roundsState: yield* RoundsState,
      repository,
      gateway,
    })
    return yield* body(app)
  }).pipe(
    Effect.scoped,
    Effect.provide(Layer.merge(GuessState.layer(), RoundsState.layer({ repository }))),
  )

test("first press has no guess", () => {
  const repository = makeMemoryRoundsRepository()
  return Effect.runPromise(withApp(repository, fixed(1), (app) =>
    Effect.gen(function*() {
      yield* app.press(new PressBit({ bit: 1 }))
      const expected: Rounds = [makeRound(1, null)]
      expect(yield* app.rounds()).toEqual(expected)
      expect(repository.saved()).toEqual(expected)
    })))
})

test("second press uses the ready guess", () => {
  const repository = makeMemoryRoundsRepository()
  return Effect.runPromise(withApp(repository, fixed(1), (app) =>
    Effect.gen(function*() {
      yield* app.press(new PressBit({ bit: 1 }))
      yield* settle
      expect(yield* app.status()).toEqual({ _tag: "Ready" })
      yield* app.press(new PressBit({ bit: 0 }))
      expect(yield* app.rounds()).toEqual([makeRound(1, null), makeRound(0, 1)])
    })))
})

test("press while thinking", () => {
  const repository = makeMemoryRoundsRepository()
  const calls: Array<Bits> = []
  return Effect.runPromise(Effect.gen(function*() {
    const gates = [0, 1, 2, 3].map(() => Deferred.makeUnsafe<Bit>())
    return yield* withApp(repository, slow(gates, calls), (app) =>
      Effect.gen(function*() {
        yield* app.press(new PressBit({ bit: 1 }))
        yield* app.press(new PressBit({ bit: 0 }))
        yield* app.press(new PressBit({ bit: 1 }))
        expect(yield* app.rounds()).toEqual([makeRound(1, null), makeRound(0, null), makeRound(1, null)])
        expect(calls.at(-1)).toEqual([1, 0, 1])
        // Old gates answer 0; their results must not reach later rounds.
        yield* Deferred.succeed(gates[0]!, 0)
        yield* Deferred.succeed(gates[1]!, 0)
        yield* settle
        expect(yield* app.status()).toEqual({ _tag: "Thinking" })
        yield* Deferred.succeed(gates[2]!, 1)
        yield* settle
        expect(yield* app.status()).toEqual({ _tag: "Ready" })
        yield* app.press(new PressBit({ bit: 1 }))
        const rounds = yield* app.rounds()
        expect(rounds[3]).toEqual(makeRound(1, 1))
        expect(rounds.map((r) => r.guess)).toEqual([null, null, null, 1])
      }))
  }))
})

test("reset while thinking", () => {
  const repository = makeMemoryRoundsRepository()
  return Effect.runPromise(Effect.gen(function*() {
    const gate = Deferred.makeUnsafe<Bit>()
    return yield* withApp(repository, slow([gate]), (app) =>
      Effect.gen(function*() {
        yield* app.press(new PressBit({ bit: 1 }))
        yield* app.reset(new ResetRounds())
        yield* Deferred.succeed(gate, 1)
        yield* settle
        expect(yield* app.rounds()).toEqual([])
        expect(repository.saved()).toEqual([])
        expect(yield* app.status()).toEqual({ _tag: "Idle" })
      }))
  }))
})

test("ResumeGame requests a guess for loaded rounds", () => {
  const repository = makeMemoryRoundsRepository([
    makeRound(1, null),
    makeRound(0, 1),
    makeRound(1, 1),
  ])
  const calls: Array<Bits> = []
  return Effect.runPromise(withApp(repository, fixed(0, calls), (app) =>
    Effect.gen(function*() {
      yield* app.resume(new ResumeGame())
      yield* settle
      expect(calls).toEqual([[1, 0, 1]])
    })))
})

test("concurrent presses keep every round, and the last guess request has all bits", () => {
  const repository = makeSlowSaveRepository()
  const calls: Array<Bits> = []
  return Effect.runPromise(withApp(repository, fixed(0, calls), (app) =>
    Effect.gen(function*() {
      const presses: Array<Bit> = [1, 0, 1]
      const fibers = yield* Effect.forEach(presses, (bit) =>
        Effect.forkChild(app.press(new PressBit({ bit }))))
      for (const fiber of fibers) yield* Fiber.join(fiber)
      yield* settle
      const rounds = yield* app.rounds()
      expect(rounds).toHaveLength(3)
      expect(repository.saved()).toEqual(rounds)
      expect(rounds.map((r) => r.bit).sort()).toEqual([0, 1, 1])
      expect(calls.at(-1)).toEqual(rounds.map((r) => r.bit))
    })))
})
