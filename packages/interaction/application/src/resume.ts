import { Data, Effect, SubscriptionRef } from "effect"
import type { UseCase } from "@guess/core"
import { RequestGuess } from "@guess/guesser-application"
import { bitsOf } from "@guess/interaction-domain"
import type { RoundsState } from "./state.ts"
import type { RequestGuess as RequestGuessCommand } from "@guess/guesser-application"

export class ResumeGame extends Data.TaggedClass("ResumeGame")<{}> {
  declare readonly "~response"?: Effect.Effect<void>
}

// The product calls this once at start: loaded rounds need a first guess.
export const makeResumeGame = (deps: {
  readonly roundsState: RoundsState["Service"]
  readonly requestGuess: UseCase<RequestGuessCommand>
}): UseCase<ResumeGame> => {
  const { roundsState, requestGuess } = deps
  return () =>
    roundsState.lock.withPermits(1)(Effect.gen(function*() {
      const current = yield* SubscriptionRef.get(roundsState.rounds)
      yield* requestGuess(new RequestGuess({ bits: bitsOf(current) }))
    }))
}
