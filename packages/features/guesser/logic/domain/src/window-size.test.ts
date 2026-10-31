import { describe, expect, test } from "vitest"
import {
  clampWindowSize,
  isWindowSize,
  WINDOW_SIZE_DEFAULT,
  WINDOW_SIZE_MAX,
  WINDOW_SIZE_MIN,
  windowSizeFor,
} from "./index.ts"

describe("window size limits", () => {
  test("the default is inside the limits", () => {
    expect(isWindowSize(WINDOW_SIZE_DEFAULT)).toBe(true)
  })
})

describe("clampWindowSize", () => {
  test("rounds and clamps to the limits", () => {
    expect(clampWindowSize(0)).toBe(WINDOW_SIZE_MIN)
    expect(clampWindowSize(-5)).toBe(WINDOW_SIZE_MIN)
    expect(clampWindowSize(300)).toBe(WINDOW_SIZE_MAX)
    expect(clampWindowSize(2.6)).toBe(3)
    expect(clampWindowSize(10)).toBe(10)
  })
})

describe("isWindowSize", () => {
  test("accepts whole numbers inside the limits", () => {
    expect(isWindowSize(WINDOW_SIZE_MIN)).toBe(true)
    expect(isWindowSize(WINDOW_SIZE_MAX)).toBe(true)
  })

  test("rejects out of range, fractions and NaN", () => {
    expect(isWindowSize(0)).toBe(false)
    expect(isWindowSize(WINDOW_SIZE_MAX + 1)).toBe(false)
    expect(isWindowSize(2.5)).toBe(false)
    expect(isWindowSize(NaN)).toBe(false)
    expect(isWindowSize(Infinity)).toBe(false)
  })
})

describe("windowSizeFor", () => {
  test("clamps a number and gives null for NaN", () => {
    expect(windowSizeFor(2.6)).toBe(3)
    expect(windowSizeFor(0)).toBe(WINDOW_SIZE_MIN)
    expect(windowSizeFor(300)).toBe(WINDOW_SIZE_MAX)
    expect(windowSizeFor(NaN)).toBeNull()
  })
})
