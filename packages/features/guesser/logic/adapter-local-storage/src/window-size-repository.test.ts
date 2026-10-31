import { Effect } from "effect"
import { WINDOW_SIZE_DEFAULT, WINDOW_SIZE_MAX } from "@guess/guesser-domain"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { makeLocalStorageWindowSizeRepository } from "./index.ts"

const repository = () => makeLocalStorageWindowSizeRepository(localStorage)

beforeEach(() => localStorage.clear())

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("makeLocalStorageWindowSizeRepository", () => {
  test("load with nothing saved returns the default", async () => {
    expect(await Effect.runPromise(repository().load)).toBe(WINDOW_SIZE_DEFAULT)
  })

  test("save then load round trip, under the key guess.windowSize", async () => {
    await Effect.runPromise(repository().save(10))
    expect(localStorage.getItem("guess.windowSize")).toBe("10")
    expect(await Effect.runPromise(repository().load)).toBe(10)
  })

  test("invalid stored values load as the default", async () => {
    for (const raw of ["abc", "", "2.5", "-3", "1e2", " 7"]) {
      localStorage.setItem("guess.windowSize", raw)
      expect(await Effect.runPromise(repository().load)).toBe(WINDOW_SIZE_DEFAULT)
    }
  })

  test("out of range stored values load as the default", async () => {
    for (const raw of ["0", String(WINDOW_SIZE_MAX + 1), "99999"]) {
      localStorage.setItem("guess.windowSize", raw)
      expect(await Effect.runPromise(repository().load)).toBe(WINDOW_SIZE_DEFAULT)
    }
  })

  test("the limits themselves are valid", async () => {
    localStorage.setItem("guess.windowSize", String(WINDOW_SIZE_MAX))
    expect(await Effect.runPromise(repository().load)).toBe(WINDOW_SIZE_MAX)
    localStorage.setItem("guess.windowSize", "1")
    expect(await Effect.runPromise(repository().load)).toBe(1)
  })

  test("a storage whose getItem throws loads as the default", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("access denied")
    })
    expect(await Effect.runPromise(repository().load)).toBe(WINDOW_SIZE_DEFAULT)
  })

  test("a failing save does not fail the effect", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota exceeded")
    })
    await expect(Effect.runPromise(repository().save(5))).resolves.toBeUndefined()
  })

  test("with no localStorage global, creating the repository does not throw and load/save do not fail", async () => {
    vi.stubGlobal("localStorage", undefined)
    let repo: ReturnType<typeof makeLocalStorageWindowSizeRepository> | undefined
    expect(() => {
      repo = makeLocalStorageWindowSizeRepository()
    }).not.toThrow()
    expect(await Effect.runPromise(repo!.load)).toBe(WINDOW_SIZE_DEFAULT)
    await expect(Effect.runPromise(repo!.save(5))).resolves.toBeUndefined()
  })

  test("a localStorage getter that throws is handled", async () => {
    vi.stubGlobal("localStorage", undefined)
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      get: () => {
        throw new Error("denied")
      },
    })
    const repo = makeLocalStorageWindowSizeRepository()
    expect(await Effect.runPromise(repo.load)).toBe(WINDOW_SIZE_DEFAULT)
    await expect(Effect.runPromise(repo.save(5))).resolves.toBeUndefined()
  })
})
