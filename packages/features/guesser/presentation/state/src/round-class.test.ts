import { expect, test } from "vitest"
import { roundClass } from "./round-class.ts"

test("a hit, a miss and a round with no guess", () => {
  expect(roundClass({ bit: 1, guess: 1, hit: true })).toBe("hit")
  expect(roundClass({ bit: 0, guess: 1, hit: false })).toBe("miss")
  expect(roundClass({ bit: 1, guess: null, hit: null })).toBe("none")
})
