import type { GuessProgress } from "../vo/guess-progress.ts"
import type { GuessStatus } from "../vo/guess-status.ts"

// Drops the guess itself: the UI must not see the bit before the press.
export const publicStatus = (progress: GuessProgress): GuessStatus => {
  switch (progress._tag) {
    case "Idle":
      return { _tag: "Idle" }
    case "Thinking":
      return { _tag: "Thinking" }
    case "Ready":
      return { _tag: "Ready" }
    case "Failed": {
      // Timeout has no message of its own, so its Error message is empty.
      const { error } = progress
      return { _tag: "Failed", reason: error._tag, message: error.message || error._tag }
    }
  }
}
