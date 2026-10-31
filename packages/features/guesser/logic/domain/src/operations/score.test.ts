import { describe, expect, test } from "vitest"
import { makeRound } from "./round.ts"
import { scoreOf } from "./score.ts"

describe("scoreOf", () => {
  test("ignores rounds without a guess", () => {
    expect(scoreOf([makeRound(1, 1), makeRound(0, 1), makeRound(1, null)])).toEqual({
      hits: 1,
      guessed: 2,
      total: 3,
      unguessed: 1,
      ratio: 0.5,
    })
  })

  test("empty rounds give ratio 0", () => {
    expect(scoreOf([])).toEqual({ hits: 0, guessed: 0, total: 0, unguessed: 0, ratio: 0 })
  })
})
