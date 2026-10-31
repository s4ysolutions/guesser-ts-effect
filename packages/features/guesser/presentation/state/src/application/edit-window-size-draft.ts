import { Data, Effect, SubscriptionRef } from "effect"
import type { UseCase } from "@guess/core"
import type { WindowSizeDraftState } from "./window-size-draft-state.ts"

export class EditWindowSizeDraft extends Data.TaggedClass("EditWindowSizeDraft")<{ readonly text: string }> {
  declare readonly "~response"?: Effect.Effect<void>
}

export const makeEditWindowSizeDraft = (deps: {
  readonly draftState: WindowSizeDraftState["Service"]
}): UseCase<EditWindowSizeDraft> =>
  (command) => SubscriptionRef.set(deps.draftState.draft, command.text)
