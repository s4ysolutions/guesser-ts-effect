import { expect, test } from "vitest"
import type { GuessStatus, Round, Score } from "@guess/guesser-application"
import { lastRoundText, noGuessText, scoreText, statusText } from "./copy.ts"

const score = (hits: number, guessed: number, total: number): Score => ({
  hits,
  guessed,
  total,
  unguessed: total - guessed,
  ratio: guessed === 0 ? 0 : hits / guessed,
})

test("statusText", () => {
  expect(statusText({ _tag: "Idle" })).toBe("Guesser needs at least one bit")
  expect(statusText({ _tag: "Thinking" })).toBe("Guesser is thinking…")
  expect(statusText({ _tag: "Ready" })).toBe("Guesser is ready")
  expect(statusText({ _tag: "Failed", reason: "Timeout", message: "no answer" } as GuessStatus)).toBe(
    "Guesser failed: no answer",
  )
})

test("scoreText rounds the ratio to a whole percent", () => {
  expect(scoreText({ ...score(37, 50, 53), ratio: 0.74 })).toBe("Guesser guessed 37 of 50 (74%)")
  expect(scoreText(score(1, 3, 3))).toBe("Guesser guessed 1 of 3 (33%)")
})

test("noGuessText is null when every round has a guess", () => {
  expect(noGuessText(score(0, 5, 5))).toBeNull()
})

test("noGuessText uses singular for one round", () => {
  expect(noGuessText(score(0, 4, 5))).toBe("1 round without a guess")
})

test("noGuessText uses the count for many rounds", () => {
  expect(noGuessText(score(0, 47, 50))).toBe("3 rounds without a guess")
})

test("lastRoundText for a hit, a miss and a round with no guess", () => {
  const hit: Round = { bit: 1, guess: 1, hit: true }
  const miss: Round = { bit: 0, guess: 1, hit: false }
  const none: Round = { bit: 1, guess: null, hit: null }
  expect(lastRoundText(hit)).toBe("You: 1 · Guess: 1 · hit")
  expect(lastRoundText(miss)).toBe("You: 0 · Guess: 1 · miss")
  expect(lastRoundText(none)).toBe("You: 1 · Guess: none · no guess")
})
