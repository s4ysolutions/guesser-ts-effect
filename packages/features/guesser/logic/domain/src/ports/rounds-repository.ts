import type { Effect } from "effect"
import type { Rounds } from "../vo/round.ts"

export interface RoundsRepository {
  readonly load: Effect.Effect<Rounds>
  readonly save: (rounds: Rounds) => Effect.Effect<void>
}
