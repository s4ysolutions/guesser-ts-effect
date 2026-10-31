import { Effect } from "effect"
import { windowSizeFor } from "../operations/window-size.ts"
import type { WindowSizeRepository } from "../ports/window-size-repository.ts"

// Saves the size for a requested number and returns it. NaN saves nothing and gives null.
export const changeWindowSize = (
  repository: WindowSizeRepository,
  requested: number,
): Effect.Effect<number | null> =>
  Effect.gen(function*() {
    const n = windowSizeFor(requested)
    if (n === null) return null
    yield* repository.save(n)
    return n
  })
