import { Deferred, Effect, Layer, Stream, SubscriptionRef } from "effect"
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

const fixed = (bit: Bit): GuessGateway => ({ guess: () => Effect.succeed({ bit }) })
const slow = (gates: Array<Deferred.Deferred<Bit>>): GuessGateway => {
  let i = 0
  return {
    guess: () => {
      const gate = gates[i++]!
      return Deferred.await(gate).pipe(Effect.map((bit) => ({ bit })))
    },
  }
}

const settle = Effect.sleep("5 millis")
const first = <A>(stream: Stream.Stream<A>) =>
  Stream.runHead(stream).pipe(Effect.map((o) => (o._tag === "Some" ? o.value : undefined)))

type Repository = ReturnType<typeof makeMemoryRoundsRepository>

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
  return Effect.runPromise(Effect.gen(function*() {
    const gates = [yield* Deferred.make<Bit>(), yield* Deferred.make<Bit>(), yield* Deferred.make<Bit>()]
    return yield* withApp(repository, slow(gates), (app) =>
      Effect.gen(function*() {
        yield* app.press(new PressBit({ bit: 1 }))
        yield* app.press(new PressBit({ bit: 0 }))
        yield* app.press(new PressBit({ bit: 1 }))
        expect(yield* app.rounds()).toEqual([makeRound(1, null), makeRound(0, null), makeRound(1, null)])
        yield* Deferred.succeed(gates[0]!, 0)
        yield* Deferred.succeed(gates[1]!, 0)
        yield* settle
        expect(yield* app.status()).toEqual({ _tag: "Thinking" })
        yield* Deferred.succeed(gates[2]!, 1)
        yield* settle
        expect(yield* app.status()).toEqual({ _tag: "Ready" })
      }))
  }))
})

test("reset while thinking", () => {
  const repository = makeMemoryRoundsRepository()
  return Effect.runPromise(Effect.gen(function*() {
    const gate = yield* Deferred.make<Bit>()
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
  const seen: Array<Bits> = []
  const gateway: GuessGateway = {
    guess: (b) => Effect.sync(() => (seen.push(b), { bit: 0 as Bit })),
  }
  return Effect.runPromise(withApp(repository, gateway, (app) =>
    Effect.gen(function*() {
      yield* app.resume(new ResumeGame())
      yield* settle
      expect(seen).toEqual([[1, 0, 1]])
    })))
})
