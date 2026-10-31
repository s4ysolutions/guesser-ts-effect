import type { Effect } from "effect"
import type { Bits } from "@guess/core"
import type { Guess } from "../vo/guess.ts"
import type { GuessFailed } from "../vo/guess-failed.ts"

export interface GuessGateway {
  readonly guess: (lastBits: Bits) => Effect.Effect<Guess, GuessFailed>
}
