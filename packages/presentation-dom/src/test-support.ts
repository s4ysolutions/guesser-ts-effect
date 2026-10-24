// Test helpers. Not exported from the package.
import { Effect, Layer, ManagedRuntime, Stream, SubscriptionRef } from "effect"
import type { UseCase, UseCaseCommand } from "@guess/core"
import type { GuessStatus, ObserveGuessStatus, ObserveWindowSize, SetWindowSize } from "@guess/guesser-application"
import type { ObserveRounds, ObserveScore, PressBit, ResetRounds, Rounds, Score } from "@guess/interaction-application"
import type { GuessUseCases } from "./views/guess-screen.ts"

/** Counts the stream consumers that are running right now. */
export interface Subscribers {
  live: number
}

export const makeFakeObserve = <A>(initial: A, subscribers: Subscribers) => {
  const ref = Effect.runSync(SubscriptionRef.make(initial))
  return {
    ref,
    useCase: (_command: UseCaseCommand<Stream.Stream<A>>): Stream.Stream<A> =>
      SubscriptionRef.changes(ref).pipe(
        Stream.onStart(Effect.sync(() => { subscribers.live++ })),
        Stream.ensuring(Effect.sync(() => { subscribers.live-- })),
      ),
    push: (value: A) => Effect.runSync(SubscriptionRef.set(ref, value)),
  }
}

export const makeFakeCommand = <C>() => {
  const calls: Array<C> = []
  return { calls, useCase: (command: C): Effect.Effect<void> => Effect.sync(() => { calls.push(command) }) }
}

export const makeFakes = () => {
  const subscribers: Subscribers = { live: 0 }
  const rounds = makeFakeObserve<Rounds>([], subscribers)
  const score = makeFakeObserve<Score>({ hits: 0, guessed: 0, total: 0, ratio: 0 }, subscribers)
  const guessStatus = makeFakeObserve<GuessStatus>({ _tag: "Idle" }, subscribers)
  const windowSize = makeFakeObserve<number>(8, subscribers)
  const pressBit = makeFakeCommand<PressBit>()
  const resetRounds = makeFakeCommand<ResetRounds>()
  const setWindowSize = makeFakeCommand<SetWindowSize>()
  const useCases: GuessUseCases = {
    observeRounds: rounds.useCase as UseCase<ObserveRounds>,
    observeScore: score.useCase as UseCase<ObserveScore>,
    observeGuessStatus: guessStatus.useCase as UseCase<ObserveGuessStatus>,
    observeWindowSize: windowSize.useCase as UseCase<ObserveWindowSize>,
    pressBit: pressBit.useCase,
    resetRounds: resetRounds.useCase,
    setWindowSize: setWindowSize.useCase,
  }
  return { subscribers, rounds, score, guessStatus, windowSize, pressBit, resetRounds, setWindowSize, useCases }
}

/** A real ManagedRuntime, as a product would pass in. */
export const makeRunner = () => ManagedRuntime.make(Layer.empty)
