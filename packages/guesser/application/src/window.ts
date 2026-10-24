import { Data, Effect, Stream, SubscriptionRef } from "effect"
import type { UseCase } from "@guess/core"
import type { GuessState } from "./state.ts"
import { clampWindowSize, saveWindowSize } from "./state.ts"
import type { RequestGuess } from "./request.ts"
import { unlockedStartOf } from "./request.ts"

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
    const start = unlockedStartOf(deps.requestGuess)
    if (start === undefined) {
      return yield* Effect.die("SetWindowSize needs a RequestGuess made by makeRequestGuess")
    }
    const { guessState } = deps
    const n = clampWindowSize(command.n)
    // One permit for set N, read bits and start: no RequestGuess can run in between.
    yield* guessState.lock.withPermits(1)(Effect.gen(function*() {
      yield* SubscriptionRef.set(guessState.windowSize, n)
      saveWindowSize(guessState.storage, n)
      const bits = yield* SubscriptionRef.get(guessState.lastBits)
      yield* start(bits)
    }))
  })

export const makeObserveWindowSize = (deps: {
  readonly guessState: GuessState["Service"]
}): UseCase<ObserveWindowSize> =>
() => SubscriptionRef.changes(deps.guessState.windowSize)
