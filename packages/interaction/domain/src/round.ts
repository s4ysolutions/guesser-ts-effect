import type { Bit, Bits } from "@guess/core"

export interface Round {
  readonly bit: Bit
  readonly guess: Bit | null
  readonly hit: boolean | null
}

export type Rounds = ReadonlyArray<Round>

export const makeRound = (bit: Bit, guess: Bit | null): Round => ({
  bit,
  guess,
  hit: guess === null ? null : guess === bit,
})

export const bitsOf = (rounds: Rounds): Bits => rounds.map((round) => round.bit)
