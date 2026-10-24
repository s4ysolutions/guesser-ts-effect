import { Effect, Result, Schema } from "effect"
import type { Rounds, RoundsRepository } from "@guess/interaction-domain"

const ROUNDS_KEY = "guess.rounds"
const CORRUPT_KEY = "guess.rounds.corrupt"

const BitSchema = Schema.Literals([0, 1])

const RoundSchema = Schema.Struct({
  bit: BitSchema,
  guess: Schema.NullOr(BitSchema),
  hit: Schema.NullOr(Schema.Boolean),
})

const RoundsJson = Schema.fromJsonString(Schema.Array(RoundSchema))

const decodeRounds = Schema.decodeUnknownResult(RoundsJson)

export const makeLocalStorageRoundsRepository = (
  storage: Storage = globalThis.localStorage,
): RoundsRepository => ({
  load: Effect.sync((): Rounds => {
    try {
      const raw = storage.getItem(ROUNDS_KEY)
      if (raw === null) return []
      const decoded = decodeRounds(raw)
      if (Result.isSuccess(decoded)) return decoded.success
      console.warn("guess: saved rounds are unreadable, starting empty")
      storage.setItem(CORRUPT_KEY, raw)
      return []
    } catch (error) {
      console.warn("guess: could not read saved rounds", error)
      return []
    }
  }),
  save: (rounds) =>
    Effect.sync(() => {
      try {
        storage.setItem(ROUNDS_KEY, JSON.stringify(rounds))
      } catch (error) {
        console.warn("guess: could not save rounds", error)
      }
    }),
})
