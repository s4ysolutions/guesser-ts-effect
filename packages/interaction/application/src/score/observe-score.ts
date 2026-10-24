import { Data, Stream, SubscriptionRef } from "effect"
import type { UseCase } from "@guess/core"
import { scoreOf } from "@guess/interaction-domain"
import type { Score } from "@guess/interaction-domain"
import type { RoundsState } from "../state.ts"

export class ObserveScore extends Data.TaggedClass("ObserveScore")<{}> {
  declare readonly "~response"?: Stream.Stream<Score>
}

export const makeObserveScore = (deps: {
  readonly roundsState: RoundsState["Service"]
}): UseCase<ObserveScore> =>
() => Stream.map(SubscriptionRef.changes(deps.roundsState.rounds), scoreOf)
