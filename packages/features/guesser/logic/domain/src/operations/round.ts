import type { Bit, Bits } from "@guess/core"
import type { Guess } from "../vo/guess.ts"
import type { Round, Rounds } from "../vo/round.ts"

export const makeRound = (bit: Bit, guess: Bit | null): Round => ({
  bit,
  guess,
  hit: guess === null ? null : guess === bit,
})

export const bitsOf = (rounds: Rounds): Bits => rounds.map((round) => round.bit)

// The rounds after a press: `guess` is the one made before it, or null if none was ready.
export const appendRound = (rounds: Rounds, bit: Bit, guess: Guess | null): Rounds => [
  ...rounds,
  makeRound(bit, guess?.bit ?? null),
]
