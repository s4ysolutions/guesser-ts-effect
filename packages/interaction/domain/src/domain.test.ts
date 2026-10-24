import { describe, expect, test } from "vitest"
import { bitsOf, makeRound, scoreOf } from "./index.ts"

describe("makeRound", () => {
  test("hit, miss and no guess", () => {
    expect(makeRound(1, 1)).toEqual({ bit: 1, guess: 1, hit: true })
    expect(makeRound(0, 1)).toEqual({ bit: 0, guess: 1, hit: false })
    expect(makeRound(0, null)).toEqual({ bit: 0, guess: null, hit: null })
  })
})

describe("scoreOf", () => {
  test("ignores rounds without a guess", () => {
    expect(scoreOf([makeRound(1, 1), makeRound(0, 1), makeRound(1, null)])).toEqual({
      hits: 1,
      guessed: 2,
      total: 3,
      ratio: 0.5,
    })
  })

  test("empty rounds give ratio 0", () => {
    expect(scoreOf([])).toEqual({ hits: 0, guessed: 0, total: 0, ratio: 0 })
  })
})

describe("bitsOf", () => {
  test("returns the bits in order", () => {
    expect(bitsOf([makeRound(1, null), makeRound(0, 1)])).toEqual([1, 0])
  })
})
