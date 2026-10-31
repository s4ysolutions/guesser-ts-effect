// Test helpers shared by the bridge test and the screen tests. Not exported from the package.
import { Effect, Layer, ManagedRuntime, Stream, SubscriptionRef } from "effect"
import { render } from "@testing-library/react"
import type { ReactNode } from "react"
import type { UseCase, UseCaseCommand } from "@guess/core"
import type { GuessStatus, ObserveGuessStatus, ObserveRounds, ObserveScore, ObserveWindowSize, PressBit, ResetRounds, Rounds, Score, SetWindowSize } from "@guess/guesser-application"
import { makeCommitWindowSizeDraft, makeEditWindowSizeDraft, makeObserveWindowSizeDraft, WindowSizeDraftState } from "@guess/guesser-state"
import { GuessProvider } from "./bridge/provider.tsx"
import type { GuessUseCases } from "./bridge/provider.tsx"

export interface FakeObserve<A> {
  readonly ref: SubscriptionRef.SubscriptionRef<A>
  readonly useCase: (command: UseCaseCommand<Stream.Stream<A>>) => Stream.Stream<A>
  readonly push: (value: A) => void
}

/** Counts the stream consumers that are running right now. */
export interface Subscribers {
  live: number
}

export const makeFakeObserve = <A,>(initial: A, subscribers: Subscribers): FakeObserve<A> => {
  const ref = Effect.runSync(SubscriptionRef.make(initial))
  return {
    ref,
    useCase: () =>
      SubscriptionRef.changes(ref).pipe(
        Stream.onStart(Effect.sync(() => { subscribers.live++ })),
        Stream.ensuring(Effect.sync(() => { subscribers.live-- })),
      ),
    push: (value) => Effect.runSync(SubscriptionRef.set(ref, value)),
  }
}

export interface FakeCommand<C> {
  readonly calls: Array<C>
  readonly useCase: (command: C) => Effect.Effect<void>
}

export const makeFakeCommand = <C,>(): FakeCommand<C> => {
  const calls: Array<C> = []
  return { calls, useCase: (command) => Effect.sync(() => { calls.push(command) }) }
}

export const makeFakes = () => {
  const subscribers: Subscribers = { live: 0 }
  const rounds = makeFakeObserve<Rounds>([], subscribers)
  const score = makeFakeObserve<Score>({ hits: 0, guessed: 0, total: 0, unguessed: 0, ratio: 0 }, subscribers)
  const guessStatus = makeFakeObserve<GuessStatus>({ _tag: "Idle" }, subscribers)
  const windowSize = makeFakeObserve<number>(8, subscribers)
  const pressBit = makeFakeCommand<PressBit>()
  const resetRounds = makeFakeCommand<ResetRounds>()
  const setWindowSize = makeFakeCommand<SetWindowSize>()
  // The draft use cases are the real ones, on fake window size use cases: the draft is not faked.
  const draftState = Effect.runSync(WindowSizeDraftState.pipe(Effect.provide(WindowSizeDraftState.layer())))
  const useCases: GuessUseCases = {
    observeRounds: rounds.useCase as UseCase<ObserveRounds>,
    observeScore: score.useCase as UseCase<ObserveScore>,
    observeGuessStatus: guessStatus.useCase as UseCase<ObserveGuessStatus>,
    observeWindowSizeDraft: makeObserveWindowSizeDraft({
      draftState,
      observeWindowSize: windowSize.useCase as UseCase<ObserveWindowSize>,
    }),
    pressBit: pressBit.useCase,
    resetRounds: resetRounds.useCase,
    editWindowSizeDraft: makeEditWindowSizeDraft({ draftState }),
    commitWindowSizeDraft: makeCommitWindowSizeDraft({ draftState, setWindowSize: setWindowSize.useCase }),
  }
  return { subscribers, rounds, score, guessStatus, windowSize, pressBit, resetRounds, setWindowSize, useCases }
}

export type Fakes = ReturnType<typeof makeFakes>

/** Renders `children` inside a GuessProvider with a real ManagedRuntime. */
export const renderWithFakes = (children: ReactNode, fakes: Fakes = makeFakes(), options?: { readonly wrapper?: React.ComponentType<{ children: ReactNode }> }) => {
  const runtime = ManagedRuntime.make(Layer.empty)
  const result = render(
    <GuessProvider runner={runtime} useCases={fakes.useCases}>{children}</GuessProvider>,
    options?.wrapper ? { wrapper: options.wrapper } : undefined,
  )
  return { ...result, fakes, runtime }
}
