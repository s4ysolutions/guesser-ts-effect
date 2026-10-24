import { Effect, Result, Schema } from "effect"
import type { Rounds, RoundsRepository } from "@guess/interaction-domain"

const ROUNDS_KEY = "guess.rounds"
const CORRUPT_KEY_PREFIX = "guess.rounds.corrupt."

const BitSchema = Schema.Literals([0, 1])

const RoundSchema = Schema.Struct({
  bit: BitSchema,
  guess: Schema.NullOr(BitSchema),
  hit: Schema.NullOr(Schema.Boolean),
})

const RoundsJson = Schema.fromJsonString(Schema.Array(RoundSchema))

const decodeRounds = Schema.decodeUnknownResult(RoundsJson)

export const makeLocalStorageRoundsRepository = (storage?: Storage): RoundsRepository => {
  // Set when unreadable data could not be copied. Saving would then destroy the only copy.
  let saveBlocked = false
  return {
    load: Effect.sync((): Rounds => {
      try {
        const target = storage ?? globalThis.localStorage
        const raw = target.getItem(ROUNDS_KEY)
        if (raw === null) return []
        const decoded = decodeRounds(raw)
        if (Result.isSuccess(decoded)) return decoded.success
        console.warn("guess: saved rounds are unreadable, starting empty")
        try {
          // A new key per copy, so an earlier copy is never overwritten.
          target.setItem(`${CORRUPT_KEY_PREFIX}${Date.now()}`, raw)
        } catch (copyError) {
          saveBlocked = true
          console.warn("guess: could not keep a copy of the unreadable rounds, saving is off", copyError)
        }
        return []
      } catch (error) {
        console.warn("guess: could not read saved rounds", error)
        return []
      }
    }),
    save: (rounds) =>
      Effect.sync(() => {
        if (saveBlocked) {
          console.warn("guess: saving is off, because unreadable rounds were not copied")
          return
        }
        try {
          const target = storage ?? globalThis.localStorage
          target.setItem(ROUNDS_KEY, JSON.stringify(rounds))
        } catch (error) {
          console.warn("guess: could not save rounds", error)
        }
      }),
  }
}
