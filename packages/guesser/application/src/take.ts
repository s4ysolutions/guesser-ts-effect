import { Data, Effect, SubscriptionRef } from "effect"
import type { UseCase } from "@guess/core"
import type { Guess } from "@guess/guesser-domain"
import type { GuessState } from "./state.ts"

export class TakeGuess extends Data.TaggedClass("TakeGuess")<{}> {
  declare readonly "~response"?: Effect.Effect<Guess | null>
}

export const makeTakeGuess = (deps: {
  readonly guessState: GuessState["Service"]
}): UseCase<TakeGuess> =>
() =>
  SubscriptionRef.modify(deps.guessState.status, (status) =>
    status._tag === "Ready"
      ? [status.guess, { _tag: "Idle" } as const]
      : [null, status])
