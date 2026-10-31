import { describe, expect, test } from "vitest"
import { Timeout, Unavailable } from "../vo/guess-failed.ts"
import { publicStatus } from "./guess-status.ts"

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
