import { Data, Effect, SubscriptionRef } from "effect"
import type { Bit, UseCase } from "@guess/core"
import { RequestGuess } from "../guess/request.ts"
import { TakeGuess } from "../guess/take.ts"
import { appendRound, bitsOf } from "@guess/guesser-domain"
import type { RoundsRepository } from "@guess/guesser-domain"
import type { RoundsState } from "./state.ts"

export class PressBit extends Data.TaggedClass("PressBit")<{ readonly bit: Bit }> {
  declare readonly "~response"?: Effect.Effect<void>
}

export const makePressBit = (deps: {
  readonly roundsState: RoundsState["Service"]
  readonly repository: RoundsRepository
  readonly takeGuess: UseCase<TakeGuess>
  readonly requestGuess: UseCase<RequestGuess>
}): UseCase<PressBit> => {
  const { roundsState, repository, takeGuess, requestGuess } = deps
  return (command) =>
    roundsState.lock.withPermits(1)(Effect.gen(function*() {
      // The guess for this bit is the one made before the press.
      const guess = yield* takeGuess(new TakeGuess())
      const current = yield* SubscriptionRef.get(roundsState.rounds)
      const next = appendRound(current, command.bit, guess)
      yield* SubscriptionRef.set(roundsState.rounds, next)
      yield* repository.save(next)
      yield* requestGuess(new RequestGuess({ bits: bitsOf(next) }))
    }))
}
