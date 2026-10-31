import { Effect } from "effect"
import type { Bit } from "@guess/core"
import { appendRound } from "../operations/round.ts"
import type { RoundsRepository } from "../ports/rounds-repository.ts"
import type { Guess } from "../vo/guess.ts"
import type { Rounds } from "../vo/round.ts"

// Adds the round for a press, saves the rounds and returns them.
export const recordRound = (
  repository: RoundsRepository,
  rounds: Rounds,
  bit: Bit,
  guess: Guess | null,
): Effect.Effect<Rounds> =>
  Effect.gen(function*() {
    const next = appendRound(rounds, bit, guess)
    yield* repository.save(next)
    return next
  })
