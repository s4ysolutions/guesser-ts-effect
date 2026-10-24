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
  vi.unstubAllGlobals()
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

  const corruptCopies = (): Array<string> =>
    Object.keys(localStorage)
      .filter((key) => key.startsWith("guess.rounds.corrupt."))
      .map((key) => localStorage.getItem(key) ?? "")

  test("corrupt JSON loads as [] and keeps the raw value under the corrupt key", async () => {
    localStorage.setItem("guess.rounds", "{oops")
    expect(await Effect.runPromise(repository().load)).toEqual([])
    expect(corruptCopies()).toEqual(["{oops"])
    expect(console.warn).toHaveBeenCalledTimes(1)
  })

  test("wrong shape loads as [] and keeps the raw value under the corrupt key", async () => {
    localStorage.setItem("guess.rounds", '[{"bit":7}]')
    expect(await Effect.runPromise(repository().load)).toEqual([])
    expect(corruptCopies()).toEqual(['[{"bit":7}]'])
    expect(console.warn).toHaveBeenCalledTimes(1)
  })

  test("a second corrupt value does not overwrite the first copy", async () => {
    const now = vi.spyOn(Date, "now")
    localStorage.setItem("guess.rounds", "{first")
    now.mockReturnValue(1)
    await Effect.runPromise(repository().load)
    localStorage.setItem("guess.rounds", "{second")
    now.mockReturnValue(2)
    await Effect.runPromise(repository().load)
    expect(corruptCopies().sort()).toEqual(["{first", "{second"])
  })

  test("when the corrupt copy fails, save is a warning no-op and the data stays", async () => {
    localStorage.setItem("guess.rounds", "{oops")
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota exceeded")
    })
    const repo = repository()
    expect(await Effect.runPromise(repo.load)).toEqual([])
    setItem.mockRestore()
    await Effect.runPromise(repo.save([makeRound(1, 1)]))
    expect(localStorage.getItem("guess.rounds")).toBe("{oops")
    expect(console.warn).toHaveBeenCalledTimes(3)
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

  test("a storage whose getItem throws loads as [] and does not fail", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("access denied")
    })
    expect(await Effect.runPromise(repository().load)).toEqual([])
    expect(console.warn).toHaveBeenCalledTimes(1)
  })

  test("with no localStorage global, creating the repository does not throw and load/save do not fail", async () => {
    vi.stubGlobal("localStorage", undefined)
    let repo: ReturnType<typeof makeLocalStorageRoundsRepository> | undefined
    expect(() => {
      repo = makeLocalStorageRoundsRepository()
    }).not.toThrow()
    expect(await Effect.runPromise(repo!.load)).toEqual([])
    await expect(
      Effect.runPromise(repo!.save([makeRound(1, 1)])),
    ).resolves.toBeUndefined()
    expect(console.warn).toHaveBeenCalledTimes(2)
  })
})
