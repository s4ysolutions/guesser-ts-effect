import { Data, Effect, SubscriptionRef } from "effect"
import type { UseCase } from "@guess/core"
import { SetWindowSize } from "@guess/guesser-application"
import type { WindowSizeDraftState } from "./window-size-draft-state.ts"
import { sendWindowSizeDraft } from "../workflows/send-window-size-draft.ts"

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
      const draft = yield* SubscriptionRef.getAndSet(draftState.draft, null)
      yield* sendWindowSizeDraft((n) => setWindowSize(new SetWindowSize({ n })), draft)
    })
}
