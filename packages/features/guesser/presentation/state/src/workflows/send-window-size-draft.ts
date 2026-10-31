import { Effect } from "effect"
import { windowSizeToCommit } from "../operations/window-size-draft.ts"

// Sends the number typed in the field, as typed. With nothing to send it does nothing.
// Domain clamps the number and ignores NaN.
export const sendWindowSizeDraft = (
  setWindowSize: (n: number) => Effect.Effect<void>,
  draft: string | null,
): Effect.Effect<void> => {
  const n = windowSizeToCommit(draft)
  return n === null ? Effect.void : setWindowSize(n)
}
