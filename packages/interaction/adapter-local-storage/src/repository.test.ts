import { Effect } from "effect"
import { makeRound } from "@guess/interaction-domain"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { makeLocalStorageRoundsRepository } from "./index.ts"

const repository = () => makeLocalStorageRoundsRepository(localStorage)

beforeEach(() => {
  localStorage.clear()
  vi.spyOn(console, "warn").mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("makeLocalStorageRoundsRepository", () => {
  test("load with nothing saved returns []", async () => {
    expect(await Effect.runPromise(repository().load)).toEqual([])
  })

  test("save then load round trip, including a round without a guess", async () => {
    const rounds = [makeRound(1, 1), makeRound(0, 1), makeRound(1, null)]
    await Effect.runPromise(repository().save(rounds))
    expect(await Effect.runPromise(repository().load)).toEqual(rounds)
  })

  test("corrupt JSON loads as [] and keeps the raw value under the corrupt key", async () => {
    localStorage.setItem("guess.rounds", "{oops")
    expect(await Effect.runPromise(repository().load)).toEqual([])
    expect(localStorage.getItem("guess.rounds.corrupt")).toBe("{oops")
    expect(console.warn).toHaveBeenCalledTimes(1)
  })

  test("wrong shape loads as [] and keeps the raw value under the corrupt key", async () => {
    localStorage.setItem("guess.rounds", '[{"bit":7}]')
    expect(await Effect.runPromise(repository().load)).toEqual([])
    expect(localStorage.getItem("guess.rounds.corrupt")).toBe('[{"bit":7}]')
    expect(console.warn).toHaveBeenCalledTimes(1)
  })

  test("a failing save does not fail the effect and warns", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota exceeded")
    })
    await expect(
      Effect.runPromise(repository().save([makeRound(1, 1)])),
    ).resolves.toBeUndefined()
    expect(console.warn).toHaveBeenCalledTimes(1)
  })
})
