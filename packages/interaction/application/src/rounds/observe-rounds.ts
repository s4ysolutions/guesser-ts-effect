import { Data, Stream, SubscriptionRef } from "effect"
import type { UseCase } from "@guess/core"
import type { Rounds } from "@guess/interaction-domain"
import type { RoundsState } from "../state.ts"

export class ObserveRounds extends Data.TaggedClass("ObserveRounds")<{}> {
  declare readonly "~response"?: Stream.Stream<Rounds>
}

export const makeObserveRounds = (deps: {
  readonly roundsState: RoundsState["Service"]
}): UseCase<ObserveRounds> =>
() => SubscriptionRef.changes(deps.roundsState.rounds)
