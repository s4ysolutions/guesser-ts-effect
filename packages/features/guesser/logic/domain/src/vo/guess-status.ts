import type { GuessFailed } from "./guess-failed.ts"

// What a UI may see: the same as GuessProgress, without the bit.
export type GuessStatus =
  | { readonly _tag: "Idle" }
  | { readonly _tag: "Thinking" }
  | { readonly _tag: "Ready" }
  | { readonly _tag: "Failed"; readonly reason: GuessFailed["_tag"]; readonly message: string }
