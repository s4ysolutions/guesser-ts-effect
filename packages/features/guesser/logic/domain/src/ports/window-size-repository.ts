import type { Effect } from "effect"

export interface WindowSizeRepository {
  readonly load: Effect.Effect<number>
  readonly save: (n: number) => Effect.Effect<void>
}
