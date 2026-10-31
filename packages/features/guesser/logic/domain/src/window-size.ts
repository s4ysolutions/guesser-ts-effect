import type { Effect } from "effect"

export const WINDOW_SIZE_DEFAULT = 32
export const WINDOW_SIZE_MIN = 1
export const WINDOW_SIZE_MAX = 256

export const clampWindowSize = (n: number): number =>
  Math.min(WINDOW_SIZE_MAX, Math.max(WINDOW_SIZE_MIN, Math.round(n)))

// A stored value is valid only if it is a whole number inside the limits.
export const isWindowSize = (n: number): boolean =>
  Number.isInteger(n) && n >= WINDOW_SIZE_MIN && n <= WINDOW_SIZE_MAX

// The size to use for a requested number, or null when the request is not a number.
export const windowSizeFor = (requested: number): number | null =>
  Number.isNaN(requested) ? null : clampWindowSize(requested)

export interface WindowSizeRepository {
  readonly load: Effect.Effect<number>
  readonly save: (n: number) => Effect.Effect<void>
}
