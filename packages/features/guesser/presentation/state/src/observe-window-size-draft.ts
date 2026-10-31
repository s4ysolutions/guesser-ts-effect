import { Data, Stream, SubscriptionRef } from "effect"
import type { UseCase } from "@guess/core"
import { ObserveWindowSize } from "@guess/guesser-application"
import type { WindowSizeDraftState } from "./window-size-draft-state.ts"

export class ObserveWindowSizeDraft extends Data.TaggedClass("ObserveWindowSizeDraft")<{}> {
  declare readonly "~response"?: Stream.Stream<string>
}

// The draft if there is one, otherwise the current size. Nothing is emitted until the size is known.
export const makeObserveWindowSizeDraft = (deps: {
  readonly draftState: WindowSizeDraftState["Service"]
  readonly observeWindowSize: UseCase<ObserveWindowSize>
}): UseCase<ObserveWindowSizeDraft> =>
() =>
  Stream.zipLatestWith(
    SubscriptionRef.changes(deps.draftState.draft),
    deps.observeWindowSize(new ObserveWindowSize()),
    (draft, size) => draft ?? String(size),
  )
