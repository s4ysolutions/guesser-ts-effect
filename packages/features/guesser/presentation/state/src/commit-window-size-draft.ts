import { Data, Effect, SubscriptionRef } from "effect"
import type { UseCase } from "@guess/core"
import { SetWindowSize } from "@guess/guesser-application"
import type { WindowSizeDraftState } from "./window-size-draft-state.ts"
import { parseWindowSizeDraft } from "./window-size-draft.ts"

export class CommitWindowSizeDraft extends Data.TaggedClass("CommitWindowSizeDraft")<{}> {
  declare readonly "~response"?: Effect.Effect<void>
}

export const makeCommitWindowSizeDraft = (deps: {
  readonly draftState: WindowSizeDraftState["Service"]
  readonly setWindowSize: UseCase<SetWindowSize>
}): UseCase<CommitWindowSizeDraft> => {
  const { draftState, setWindowSize } = deps
  return () =>
    Effect.gen(function*() {
      // Take the draft and clear it in one step: the field shows the current size again.
      const text = yield* SubscriptionRef.getAndSet(draftState.draft, null)
      if (text === null) return
      const n = parseWindowSizeDraft(text)
      // The number goes on as typed, NaN included. Domain clamps it and ignores NaN.
      if (n !== null) yield* setWindowSize(new SetWindowSize({ n }))
    })
}
