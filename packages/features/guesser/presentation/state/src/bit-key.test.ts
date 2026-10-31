import { expect, test } from "vitest"
import { bitForKey } from "./bit-key.ts"

const press = (key: string, extra: Partial<Parameters<typeof bitForKey>[0]> = {}) =>
  bitForKey({ key, repeat: false, ctrlKey: false, metaKey: false, altKey: false, inInput: false, ...extra })

test("keys 0 and 1 give their bit", () => {
  expect(press("0")).toBe(0)
  expect(press("1")).toBe(1)
})

test("other keys give null", () => {
  expect(press("a")).toBeNull()
  expect(press("2")).toBeNull()
  expect(press("Enter")).toBeNull()
})

test("auto-repeat gives null", () => {
  expect(press("1", { repeat: true })).toBeNull()
})

test("Ctrl, Meta and Alt give null", () => {
  expect(press("0", { ctrlKey: true })).toBeNull()
  expect(press("0", { metaKey: true })).toBeNull()
  expect(press("1", { altKey: true })).toBeNull()
})

test("typing in an input gives null", () => {
  expect(press("1", { inInput: true })).toBeNull()
})
