import type { Bit } from "@guess/core"

export interface Guess {
  readonly bit: Bit
  readonly confidence?: number
}
