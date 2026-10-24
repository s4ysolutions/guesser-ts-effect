import { Data, Effect, SubscriptionRef } from "effect"
import type { UseCase } from "@guess/core"
import { RequestGuess } from "@guess/guesser-application"
import type { RoundsRepository } from "@guess/interaction-domain"
import type { RoundsState } from "../state.ts"
import type { RequestGuess as RequestGuessCommand } from "@guess/guesser-application"

export class ResetRounds extends Data.TaggedClass("ResetRounds")<{}> {
  declare readonly "~response"?: Effect.Effect<void>
}

export const makeResetRounds = (deps: {
  readonly roundsState: RoundsState["Service"]
  readonly repository: RoundsRepository
  readonly requestGuess: UseCase<RequestGuessCommand>
}): UseCase<ResetRounds> => {
  const { roundsState, repository, requestGuess } = deps
  return () =>
    roundsState.lock.withPermits(1)(Effect.gen(function*() {
      yield* SubscriptionRef.set(roundsState.rounds, [])
      yield* repository.save([])
      // An empty request interrupts a running guess and sets Idle.
      yield* requestGuess(new RequestGuess({ bits: [] }))
    }))
}
