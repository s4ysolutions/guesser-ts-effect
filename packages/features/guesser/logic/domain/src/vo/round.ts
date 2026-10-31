import type { Bit } from "@guess/core"

export interface Round {
  readonly bit: Bit
  readonly guess: Bit | null
  readonly hit: boolean | null
}

export type Rounds = ReadonlyArray<Round>
