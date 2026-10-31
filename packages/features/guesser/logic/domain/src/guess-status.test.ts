import { describe, expect, test } from "vitest"
import {
  progressAfterFailure,
  progressAfterSuccess,
  progressForRequest,
  publicStatus,
  takeGuess,
  Timeout,
  Unavailable,
} from "./index.ts"
import type { GuessProgress } from "./index.ts"

describe("progressForRequest", () => {
  test("no bits gives Idle, otherwise Thinking", () => {
    expect(progressForRequest([])).toEqual({ _tag: "Idle" })
    expect(progressForRequest([1])).toEqual({ _tag: "Thinking" })
  })
})

describe("progress after a result", () => {
  test("success gives Ready with the guess", () => {
    expect(progressAfterSuccess({ bit: 1 })).toEqual({ _tag: "Ready", guess: { bit: 1 } })
  })

  test("failure gives Failed with the error", () => {
    const error = new Unavailable({ message: "down" })
    expect(progressAfterFailure(error)).toEqual({ _tag: "Failed", error })
  })
})

describe("takeGuess", () => {
  test("a ready guess is returned and the progress goes to Idle", () => {
    expect(takeGuess({ _tag: "Ready", guess: { bit: 0 } })).toEqual({
      guess: { bit: 0 },
      progress: { _tag: "Idle" },
    })
  })

  test("any other progress gives null and stays the same", () => {
    const others: Array<GuessProgress> = [
      { _tag: "Idle" },
      { _tag: "Thinking" },
      { _tag: "Failed", error: new Timeout() },
    ]
    for (const progress of others) {
      expect(takeGuess(progress)).toEqual({ guess: null, progress })
    }
  })
})

describe("publicStatus", () => {
  test("Ready drops the guess", () => {
    const status = publicStatus({ _tag: "Ready", guess: { bit: 1, confidence: 0.5 } })
    expect(status).toEqual({ _tag: "Ready" })
    expect(status).not.toHaveProperty("guess")
  })

  test("Idle and Thinking pass through", () => {
    expect(publicStatus({ _tag: "Idle" })).toEqual({ _tag: "Idle" })
    expect(publicStatus({ _tag: "Thinking" })).toEqual({ _tag: "Thinking" })
  })

  test("Failed gives the reason and message; Timeout falls back to its tag", () => {
    expect(publicStatus({ _tag: "Failed", error: new Unavailable({ message: "down" }) })).toEqual({
      _tag: "Failed",
      reason: "Unavailable",
      message: "down",
    })
    expect(publicStatus({ _tag: "Failed", error: new Timeout() })).toEqual({
      _tag: "Failed",
      reason: "Timeout",
      message: "Timeout",
    })
  })
})
