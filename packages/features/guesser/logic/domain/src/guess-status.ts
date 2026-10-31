import type { Bits } from "@guess/core"
import type { Guess, GuessFailed } from "./guess.ts"

// The full status, including the guess itself. Only application state holds it.
export type GuessProgress =
  | { readonly _tag: "Idle" }
  | { readonly _tag: "Thinking" }
  | { readonly _tag: "Ready"; readonly guess: Guess }
  | { readonly _tag: "Failed"; readonly error: GuessFailed }

// What a UI may see: the same, without the bit.
export type GuessStatus =
  | { readonly _tag: "Idle" }
  | { readonly _tag: "Thinking" }
  | { readonly _tag: "Ready" }
  | { readonly _tag: "Failed"; readonly reason: GuessFailed["_tag"]; readonly message: string }

export const IDLE: GuessProgress = { _tag: "Idle" }

// No bits: nothing to guess from. Otherwise a guess is on its way.
export const progressForRequest = (bits: Bits): GuessProgress =>
  bits.length === 0 ? IDLE : { _tag: "Thinking" }

export const progressAfterSuccess = (guess: Guess): GuessProgress => ({ _tag: "Ready", guess })

export const progressAfterFailure = (error: GuessFailed): GuessProgress => ({ _tag: "Failed", error })

// Only a ready guess can be taken. Taking it resets the progress to Idle.
export const takeGuess = (
  progress: GuessProgress,
): { readonly guess: Guess | null; readonly progress: GuessProgress } =>
  progress._tag === "Ready"
    ? { guess: progress.guess, progress: IDLE }
    : { guess: null, progress }

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
