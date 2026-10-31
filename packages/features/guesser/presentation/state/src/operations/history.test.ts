import { expect, test } from "vitest"
import type { Round, Rounds } from "@guess/guesser-application"
import { recentRounds } from "./history.ts"

const round = (bit: 0 | 1): Round => ({ bit, guess: null, hit: null })

test("fewer rounds than the limit are all kept", () => {
  const rounds: Rounds = [round(0), round(1)]
  expect(recentRounds(rounds)).toEqual(rounds)
})

test("only the last 40 rounds are kept, oldest first", () => {
  const rounds: Rounds = Array.from({ length: 45 }, (_, i) => round(i % 2 === 0 ? 0 : 1))
  const recent = recentRounds(rounds)
  expect(recent).toHaveLength(40)
  expect(recent[0]).toBe(rounds[5])
  expect(recent.at(-1)).toBe(rounds[44])
})
