import { Data, Stream, SubscriptionRef } from "effect"
import type { UseCase } from "@guess/core"
import type { GuessFailed } from "@guess/guesser-domain"
import type { GuessState, InternalStatus } from "./state.ts"

export type GuessStatus =
  | { readonly _tag: "Idle" }
  | { readonly _tag: "Thinking" }
  | { readonly _tag: "Ready" }
  | { readonly _tag: "Failed"; readonly reason: GuessFailed["_tag"]; readonly message: string }

export class ObserveGuessStatus extends Data.TaggedClass("ObserveGuessStatus")<{}> {
  declare readonly "~response"?: Stream.Stream<GuessStatus>
}

// Drops the guess itself: the UI must not see the bit before the press.
const toPublic = (status: InternalStatus): GuessStatus => {
  switch (status._tag) {
    case "Idle":
      return { _tag: "Idle" }
    case "Thinking":
      return { _tag: "Thinking" }
    case "Ready":
      return { _tag: "Ready" }
    case "Failed": {
      // Timeout has no message of its own, so its Error message is empty.
      const { error } = status
      return { _tag: "Failed", reason: error._tag, message: error.message || error._tag }
    }
  }
}

export const makeObserveGuessStatus = (deps: {
  readonly guessState: GuessState["Service"]
}): UseCase<ObserveGuessStatus> =>
() => Stream.map(SubscriptionRef.changes(deps.guessState.status), toPublic)
