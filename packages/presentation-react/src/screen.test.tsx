import { act, cleanup, fireEvent, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import type { GuessStatus } from "@guess/guesser-application"
import type { Round, Score } from "@guess/interaction-application"
import { GuessScreen } from "./components/GuessScreen.tsx"
import {
  lastRoundText,
  noGuessText,
  scoreText,
  statusText,
} from "./copy.ts"
import { makeFakes, renderWithFakes } from "./test-support.tsx"

afterEach(cleanup)

describe("copy functions", () => {
  it("statusText", () => {
    expect(statusText({ _tag: "Idle" })).toBe("Guesser needs at least one bit")
    expect(statusText({ _tag: "Thinking" })).toBe("Guesser is thinking…")
    expect(statusText({ _tag: "Ready" })).toBe("Guesser is ready")
    expect(statusText({ _tag: "Failed", reason: "Timeout", message: "no answer" } as GuessStatus)).toBe(
      "Guesser failed: no answer",
    )
  })

  it("scoreText rounds the ratio to a whole percent", () => {
    const score: Score = { hits: 37, guessed: 50, total: 53, ratio: 0.74 }
    expect(scoreText(score)).toBe("Guesser guessed 37 of 50 (74%)")
    expect(scoreText({ hits: 1, guessed: 3, total: 3, ratio: 1 / 3 })).toBe("Guesser guessed 1 of 3 (33%)")
  })

  it("noGuessText is null when every round has a guess", () => {
    expect(noGuessText({ hits: 0, guessed: 5, total: 5, ratio: 0 })).toBeNull()
  })

  it("noGuessText uses singular for one round", () => {
    expect(noGuessText({ hits: 0, guessed: 4, total: 5, ratio: 0 })).toBe("1 round without a guess")
  })

  it("noGuessText uses the count for many rounds", () => {
    expect(noGuessText({ hits: 0, guessed: 47, total: 50, ratio: 0 })).toBe("3 rounds without a guess")
  })

  it("lastRoundText for a hit, a miss and a round with no guess", () => {
    const hit: Round = { bit: 1, guess: 1, hit: true }
    const miss: Round = { bit: 0, guess: 1, hit: false }
    const none: Round = { bit: 1, guess: null, hit: null }
    expect(lastRoundText(hit)).toBe("You: 1 · Guess: 1 · hit")
    expect(lastRoundText(miss)).toBe("You: 0 · Guess: 1 · miss")
    expect(lastRoundText(none)).toBe("You: 1 · Guess: none · no guess")
  })
})

describe("GuessScreen", () => {
  it("a button press sends PressBit with that bit", async () => {
    const fakes = makeFakes()
    renderWithFakes(<GuessScreen />, fakes)
    fireEvent.click(screen.getByRole("button", { name: "1" }))
    await waitFor(() => expect(fakes.pressBit.calls).toHaveLength(1))
    expect(fakes.pressBit.calls[0]?.bit).toBe(1)
  })

  it("keys 0 and 1 press; other keys and auto-repeat do not", async () => {
    const fakes = makeFakes()
    renderWithFakes(<GuessScreen />, fakes)
    fireEvent.keyDown(window, { key: "0" })
    fireEvent.keyDown(window, { key: "a" })
    fireEvent.keyDown(window, { key: "1", repeat: true })
    fireEvent.keyDown(window, { key: "1" })
    await waitFor(() => expect(fakes.pressBit.calls).toHaveLength(2))
    expect(fakes.pressBit.calls.map((call) => call.bit)).toEqual([0, 1])
  })

  it("the window size input sends the typed number on blur, out of range included", async () => {
    const fakes = makeFakes()
    renderWithFakes(<GuessScreen />, fakes)
    const input = screen.getByLabelText("Bits the guesser sees (N)")
    fireEvent.change(input, { target: { value: "300" } })
    fireEvent.blur(input)
    await waitFor(() => expect(fakes.setWindowSize.calls).toHaveLength(1))
    expect(fakes.setWindowSize.calls[0]?.n).toBe(300)
  })

  it("an empty window size input sends nothing and shows the current size", async () => {
    const fakes = makeFakes()
    renderWithFakes(<GuessScreen />, fakes)
    const input = screen.getByLabelText("Bits the guesser sees (N)") as HTMLInputElement
    await waitFor(() => expect(input.value).toBe("8"))
    fireEvent.change(input, { target: { value: "" } })
    fireEvent.blur(input)
    expect(fakes.setWindowSize.calls).toHaveLength(0)
    expect(input.value).toBe("8")
  })

  it("after blur the N field shows the current size, even when the clamped value is unchanged", async () => {
    const fakes = makeFakes()
    renderWithFakes(<GuessScreen />, fakes)
    const input = screen.getByLabelText("Bits the guesser sees (N)") as HTMLInputElement
    act(() => fakes.windowSize.push(256))
    await waitFor(() => expect(input.value).toBe("256"))
    fireEvent.change(input, { target: { value: "300" } })
    fireEvent.blur(input)
    await waitFor(() => expect(fakes.setWindowSize.calls).toHaveLength(1))
    expect(fakes.setWindowSize.calls[0]?.n).toBe(300)
    expect(input.value).toBe("256")
  })

  it("the window size input shows the size that ObserveWindowSize emits", async () => {
    const fakes = makeFakes()
    renderWithFakes(<GuessScreen />, fakes)
    const input = screen.getByLabelText("Bits the guesser sees (N)") as HTMLInputElement
    fireEvent.change(input, { target: { value: "300" } })
    fireEvent.blur(input)
    await waitFor(() => expect(fakes.setWindowSize.calls).toHaveLength(1))
    act(() => fakes.windowSize.push(256))
    await waitFor(() => expect(input.value).toBe("256"))
  })

  it("shows the status, score and last round from the observed values", async () => {
    const fakes = makeFakes()
    renderWithFakes(<GuessScreen />, fakes)
    act(() => {
      fakes.guessStatus.push({ _tag: "Ready" })
      fakes.score.push({ hits: 1, guessed: 2, total: 3, ratio: 0.5 })
      fakes.rounds.push([{ bit: 0, guess: 0, hit: true }])
    })
    await waitFor(() => expect(screen.getByText("Guesser is ready")).toBeTruthy())
    expect(screen.getByText("Guesser guessed 1 of 2 (50%)")).toBeTruthy()
    expect(screen.getByText("1 round without a guess")).toBeTruthy()
    expect(screen.getByText("You: 0 · Guess: 0 · hit")).toBeTruthy()
  })

  it("the reset button sends ResetRounds", async () => {
    const fakes = makeFakes()
    renderWithFakes(<GuessScreen />, fakes)
    fireEvent.click(screen.getByRole("button", { name: "Reset" }))
    await waitFor(() => expect(fakes.resetRounds.calls).toHaveLength(1))
  })
})
