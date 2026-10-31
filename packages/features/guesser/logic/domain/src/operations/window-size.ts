import { WINDOW_SIZE_MAX, WINDOW_SIZE_MIN } from "../vo/window-size.ts"

export const clampWindowSize = (n: number): number =>
  Math.min(WINDOW_SIZE_MAX, Math.max(WINDOW_SIZE_MIN, Math.round(n)))

// A stored value is valid only if it is a whole number inside the limits.
export const isWindowSize = (n: number): boolean =>
  Number.isInteger(n) && n >= WINDOW_SIZE_MIN && n <= WINDOW_SIZE_MAX

// The size to use for a requested number, or null when the request is not a number.
export const windowSizeFor = (requested: number): number | null =>
  Number.isNaN(requested) ? null : clampWindowSize(requested)
