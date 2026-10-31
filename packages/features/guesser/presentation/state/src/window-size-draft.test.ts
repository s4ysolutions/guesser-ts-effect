import { expect, test } from "vitest"
import { parseWindowSizeDraft } from "./window-size-draft.ts"

test("a number is returned as typed, not clamped or rounded", () => {
  expect(parseWindowSizeDraft("12")).toBe(12)
  expect(parseWindowSizeDraft("300")).toBe(300)
  expect(parseWindowSizeDraft("2.6")).toBe(2.6)
  expect(parseWindowSizeDraft("-5")).toBe(-5)
})

test("empty or blank text gives null, not 0", () => {
  expect(parseWindowSizeDraft("")).toBeNull()
  expect(parseWindowSizeDraft("   ")).toBeNull()
})

test("text that is not a number gives NaN: domain is the only place that rejects it", () => {
  expect(parseWindowSizeDraft("abc")).toBeNaN()
  expect(parseWindowSizeDraft("1x")).toBeNaN()
})
