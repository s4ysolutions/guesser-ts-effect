import type { Guess } from "./guess.ts"
import type { GuessFailed } from "./guess-failed.ts"

// The full status, including the guess itself. Only application state holds it.
export type GuessProgress =
  | { readonly _tag: "Idle" }
  | { readonly _tag: "Thinking" }
  | { readonly _tag: "Ready"; readonly guess: Guess }
  | { readonly _tag: "Failed"; readonly error: GuessFailed }

export const IDLE: GuessProgress = { _tag: "Idle" }
