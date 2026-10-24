import { Data, Effect, SubscriptionRef } from "effect"
import type { Bit, UseCase } from "@guess/core"
import { RequestGuess, TakeGuess } from "@guess/guesser-application"
import { bitsOf, makeRound } from "@guess/interaction-domain"
import type { RoundsRepository } from "@guess/interaction-domain"
import type { RoundsState } from "../state.ts"
import type { RequestGuess as RequestGuessCommand, TakeGuess as TakeGuessCommand } from "@guess/guesser-application"

export class PressBit extends Data.TaggedClass("PressBit")<{ readonly bit: Bit }> {
  declare readonly "~response"?: Effect.Effect<void>
}

export const makePressBit = (deps: {
  readonly roundsState: RoundsState["Service"]
  readonly repository: RoundsRepository
  readonly takeGuess: UseCase<TakeGuessCommand>
  readonly requestGuess: UseCase<RequestGuessCommand>
}): UseCase<PressBit> => {
  const { roundsState, repository, takeGuess, requestGuess } = deps
  return (command) =>
    roundsState.lock.withPermits(1)(Effect.gen(function*() {
      // The guess for this bit is the one made before the press.
      const guess = yield* takeGuess(new TakeGuess())
      const current = yield* SubscriptionRef.get(roundsState.rounds)
      const next = [...current, makeRound(command.bit, guess?.bit ?? null)]
      yield* SubscriptionRef.set(roundsState.rounds, next)
      yield* repository.save(next)
      yield* requestGuess(new RequestGuess({ bits: bitsOf(next) }))
    }))
}
