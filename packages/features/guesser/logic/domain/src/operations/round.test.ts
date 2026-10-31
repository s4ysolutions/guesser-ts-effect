import { describe, expect, test } from "vitest"
import { appendRound, bitsOf, makeRound } from "./round.ts"

describe("makeRound", () => {
  test("hit, miss and no guess", () => {
    expect(makeRound(1, 1)).toEqual({ bit: 1, guess: 1, hit: true })
    expect(makeRound(0, 1)).toEqual({ bit: 0, guess: 1, hit: false })
    expect(makeRound(0, null)).toEqual({ bit: 0, guess: null, hit: null })
  })
})

describe("bitsOf", () => {
  test("returns the bits in order", () => {
    expect(bitsOf([makeRound(1, null), makeRound(0, 1)])).toEqual([1, 0])
  })
})

describe("appendRound", () => {
  test("appends a round with the guess made before the press", () => {
    const before = [makeRound(1, null)]
    expect(appendRound(before, 0, { bit: 1 })).toEqual([makeRound(1, null), makeRound(0, 1)])
    expect(before).toEqual([makeRound(1, null)])
  })

  test("no ready guess gives a round without a guess", () => {
    expect(appendRound([], 1, null)).toEqual([makeRound(1, null)])
  })
})
