import { Effect } from "effect"
import { WINDOW_SIZE_DEFAULT } from "@guess/guesser-domain"
import type { Rounds, RoundsRepository, WindowSizeRepository } from "@guess/guesser-domain"

export const makeMemoryRoundsRepository = (initial: Rounds = []): RoundsRepository & {
  readonly saved: () => Rounds
} => {
  let current: Rounds = initial
  return {
    load: Effect.sync(() => current),
    save: (rounds) => Effect.sync(() => void (current = rounds)),
    saved: () => current,
  }
}

export const makeMemoryWindowSizeRepository = (initial: number = WINDOW_SIZE_DEFAULT): WindowSizeRepository & {
  readonly saved: () => number
} => {
  let current = initial
  return {
    load: Effect.sync(() => current),
    save: (n) => Effect.sync(() => void (current = n)),
    saved: () => current,
  }
}
