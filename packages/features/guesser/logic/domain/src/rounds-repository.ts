import type { Effect } from "effect"
import type { Rounds } from "./round.ts"

export interface RoundsRepository {
  readonly load: Effect.Effect<Rounds>
  readonly save: (rounds: Rounds) => Effect.Effect<void>
}
