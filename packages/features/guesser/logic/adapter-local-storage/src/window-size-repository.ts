import { Effect } from "effect"
import { isWindowSize, WINDOW_SIZE_DEFAULT } from "@guess/guesser-domain"
import type { WindowSizeRepository } from "@guess/guesser-domain"

const WINDOW_SIZE_KEY = "guess.windowSize"

export const makeLocalStorageWindowSizeRepository = (storage?: Storage): WindowSizeRepository => ({
  load: Effect.sync(() => {
    try {
      const raw = (storage ?? globalThis.localStorage).getItem(WINDOW_SIZE_KEY)
      if (raw === null || !/^\d+$/.test(raw)) return WINDOW_SIZE_DEFAULT
      const n = Number(raw)
      return isWindowSize(n) ? n : WINDOW_SIZE_DEFAULT
    } catch {
      return WINDOW_SIZE_DEFAULT
    }
  }),
  save: (n) =>
    Effect.sync(() => {
      try {
        ;(storage ?? globalThis.localStorage).setItem(WINDOW_SIZE_KEY, String(n))
      } catch {
        // Storage may be full or blocked. The size still works for this session.
      }
    }),
})
