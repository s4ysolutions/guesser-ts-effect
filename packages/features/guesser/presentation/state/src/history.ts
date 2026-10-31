import type { Rounds } from "@guess/guesser-application"

// The history strip draws this many rounds. Application keeps and counts all of them.
export const HISTORY_LENGTH = 40

/** The last `HISTORY_LENGTH` rounds, oldest first. */
export const recentRounds = (rounds: Rounds): Rounds => rounds.slice(-HISTORY_LENGTH)
