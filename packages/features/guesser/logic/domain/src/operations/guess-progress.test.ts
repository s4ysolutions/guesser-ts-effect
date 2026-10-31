import { describe, expect, test } from "vitest"
import { Timeout, Unavailable } from "../vo/guess-failed.ts"
import type { GuessProgress } from "../vo/guess-progress.ts"
import { progressAfterFailure, progressAfterSuccess, progressForRequest, takeGuess } from "./guess-progress.ts"

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
