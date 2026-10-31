import { Data, Stream, SubscriptionRef } from "effect"
import type { UseCase } from "@guess/core"
import { publicStatus } from "@guess/guesser-domain"
import type { GuessStatus } from "@guess/guesser-domain"
import type { GuessState } from "./state.ts"

export class ObserveGuessStatus extends Data.TaggedClass("ObserveGuessStatus")<{}> {
  declare readonly "~response"?: Stream.Stream<GuessStatus>
}

export const makeObserveGuessStatus = (deps: {
  readonly guessState: GuessState["Service"]
}): UseCase<ObserveGuessStatus> =>
() => Stream.map(SubscriptionRef.changes(deps.guessState.status), publicStatus)
