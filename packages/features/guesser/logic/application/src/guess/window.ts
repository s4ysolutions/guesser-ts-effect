import { Data, Effect, Stream, SubscriptionRef } from "effect"
import type { UseCase } from "@guess/core"
import type { GuessState } from "./state.ts"
import { makeLongestMatchGateway } from "@guess/guesser-adapter-longest-match"
import { changeWindowSize } from "@guess/guesser-domain"
import type { GuessGateway, WindowSizeRepository } from "@guess/guesser-domain"
import { startGuess } from "./request.ts"

export class SetWindowSize extends Data.TaggedClass("SetWindowSize")<{ readonly n: number }> {
  declare readonly "~response"?: Effect.Effect<void>
}

export class ObserveWindowSize extends Data.TaggedClass("ObserveWindowSize")<{}> {
  declare readonly "~response"?: Stream.Stream<number>
}

export const makeSetWindowSize = (deps: {
  readonly guessState: GuessState["Service"]
  readonly windowSizeRepository: WindowSizeRepository
  readonly gateway?: GuessGateway
}): UseCase<SetWindowSize> => {
  const { guessState, windowSizeRepository } = deps
  const gateway = deps.gateway ?? makeLongestMatchGateway()
  return (command) =>
    // One permit for save, set N, read bits and start: no RequestGuess can run in between.
    guessState.lock.withPermits(1)(Effect.gen(function*() {
      const n = yield* changeWindowSize(windowSizeRepository, command.n)
      if (n === null) return
      yield* SubscriptionRef.set(guessState.windowSize, n)
      const bits = yield* SubscriptionRef.get(guessState.lastBits)
      yield* startGuess(guessState, gateway, bits)
    }))
}

export const makeObserveWindowSize = (deps: {
  readonly guessState: GuessState["Service"]
}): UseCase<ObserveWindowSize> =>
  () => SubscriptionRef.changes(deps.guessState.windowSize)
