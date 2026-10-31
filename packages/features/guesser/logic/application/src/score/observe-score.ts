import { Data, Stream, SubscriptionRef } from "effect"
import type { UseCase } from "@guess/core"
import { scoreOf } from "@guess/guesser-domain"
import type { Score } from "@guess/guesser-domain"
import type { RoundsState } from "../rounds/state.ts"

export class ObserveScore extends Data.TaggedClass("ObserveScore")<{}> {
  declare readonly "~response"?: Stream.Stream<Score>
}

export const makeObserveScore = (deps: {
  readonly roundsState: RoundsState["Service"]
}): UseCase<ObserveScore> =>
() => Stream.map(SubscriptionRef.changes(deps.roundsState.rounds), scoreOf)
