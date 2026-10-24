import { Effect } from "effect"
import type { Rounds, RoundsRepository } from "@guess/interaction-domain"

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
