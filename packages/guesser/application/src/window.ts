import { Data, Effect, Stream, SubscriptionRef } from "effect"
import type { UseCase } from "@guess/core"
import type { GuessState } from "./state.ts"
import { clampWindowSize, saveWindowSize } from "./state.ts"
import { RequestGuess } from "./request.ts"

export class SetWindowSize extends Data.TaggedClass("SetWindowSize")<{ readonly n: number }> {
  declare readonly "~response"?: Effect.Effect<void>
}

export class ObserveWindowSize extends Data.TaggedClass("ObserveWindowSize")<{}> {
  declare readonly "~response"?: Stream.Stream<number>
}

export const makeSetWindowSize = (deps: {
  readonly guessState: GuessState["Service"]
  readonly requestGuess: UseCase<RequestGuess>
}): UseCase<SetWindowSize> =>
(command) =>
  Effect.gen(function*() {
    if (Number.isNaN(command.n)) return
    const n = clampWindowSize(command.n)
    yield* SubscriptionRef.set(deps.guessState.windowSize, n)
    saveWindowSize(deps.guessState.storage, n)
    const bits = yield* SubscriptionRef.get(deps.guessState.lastBits)
    yield* deps.requestGuess(new RequestGuess({ bits }))
  })

export const makeObserveWindowSize = (deps: {
  readonly guessState: GuessState["Service"]
}): UseCase<ObserveWindowSize> =>
() => SubscriptionRef.changes(deps.guessState.windowSize)
