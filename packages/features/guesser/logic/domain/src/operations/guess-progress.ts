import type { Bits } from "@guess/core"
import type { Guess } from "../vo/guess.ts"
import type { GuessFailed } from "../vo/guess-failed.ts"
import { IDLE } from "../vo/guess-progress.ts"
import type { GuessProgress } from "../vo/guess-progress.ts"

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
