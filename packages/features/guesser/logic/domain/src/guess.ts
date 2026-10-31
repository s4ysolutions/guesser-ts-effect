import type { Effect } from "effect"
import { Data } from "effect"
import type { Bit, Bits } from "@guess/core"

export interface Guess {
  readonly bit: Bit
  readonly confidence?: number
}

export class Unavailable extends Data.TaggedError("Unavailable")<{ readonly message: string }> {}

export class BadAnswer extends Data.TaggedError("BadAnswer")<{ readonly message: string }> {}

export class Timeout extends Data.TaggedError("Timeout")<{}> {}

export type GuessFailed = Unavailable | BadAnswer | Timeout

export interface GuessGateway {
  readonly guess: (lastBits: Bits) => Effect.Effect<Guess, GuessFailed>
}
