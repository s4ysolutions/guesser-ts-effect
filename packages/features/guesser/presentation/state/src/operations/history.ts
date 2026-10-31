import type { Rounds } from "@guess/guesser-application"
import { HISTORY_LENGTH } from "../vo/history-length.ts"

/** The last `HISTORY_LENGTH` rounds, oldest first. */
export const recentRounds = (rounds: Rounds): Rounds => rounds.slice(-HISTORY_LENGTH)
