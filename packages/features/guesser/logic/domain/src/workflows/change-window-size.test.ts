import { Effect } from "effect"
import { expect, test } from "vitest"
import type { WindowSizeRepository } from "../ports/window-size-repository.ts"
import { WINDOW_SIZE_MAX } from "../vo/window-size.ts"
import { changeWindowSize } from "./change-window-size.ts"

const makeFakeRepository = () => {
  const saves: Array<number> = []
  const repository: WindowSizeRepository = {
    load: Effect.succeed(32),
    save: (n) => Effect.sync(() => void saves.push(n)),
  }
  return { repository, saves }
}

test("saves the size and returns it", async () => {
  const { repository, saves } = makeFakeRepository()
  expect(await Effect.runPromise(changeWindowSize(repository, 10))).toBe(10)
  expect(saves).toEqual([10])
})

test("clamps a number outside the limits before saving", async () => {
  const { repository, saves } = makeFakeRepository()
  expect(await Effect.runPromise(changeWindowSize(repository, 9999))).toBe(WINDOW_SIZE_MAX)
  expect(saves).toEqual([WINDOW_SIZE_MAX])
})

test("NaN saves nothing and returns null", async () => {
  const { repository, saves } = makeFakeRepository()
  expect(await Effect.runPromise(changeWindowSize(repository, NaN))).toBeNull()
  expect(saves).toEqual([])
})
