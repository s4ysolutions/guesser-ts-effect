import { act, cleanup, fireEvent, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { GuessScreen } from "./components/GuessScreen.tsx"
import { makeFakes, renderWithFakes } from "./test-support.tsx"

afterEach(cleanup)

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

  it("keys with Ctrl, Meta or Alt do not press", async () => {
    const fakes = makeFakes()
    renderWithFakes(<GuessScreen />, fakes)
    fireEvent.keyDown(window, { key: "0", ctrlKey: true })
    fireEvent.keyDown(window, { key: "0", metaKey: true })
    fireEvent.keyDown(window, { key: "1", altKey: true })
    fireEvent.keyDown(window, { key: "1" })
    await waitFor(() => expect(fakes.pressBit.calls).toHaveLength(1))
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(fakes.pressBit.calls.map((call) => call.bit)).toEqual([1])
  })

  it("Enter in the N field leaves the field and sends N", async () => {
    const fakes = makeFakes()
    renderWithFakes(<GuessScreen />, fakes)
    const input = screen.getByLabelText("Bits the guesser sees (N)")
    input.focus()
    fireEvent.change(input, { target: { value: "12" } })
    fireEvent.keyDown(input, { key: "Enter" })
    await waitFor(() => expect(fakes.setWindowSize.calls).toHaveLength(1))
    expect(fakes.setWindowSize.calls[0]?.n).toBe(12)
    expect(document.activeElement).not.toBe(input)
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

  it("blur with no edit does not call setWindowSize", async () => {
    const fakes = makeFakes()
    renderWithFakes(<GuessScreen />, fakes)
    const input = screen.getByLabelText("Bits the guesser sees (N)") as HTMLInputElement
    await waitFor(() => expect(input.value).toBe("8"))
    input.focus()
    fireEvent.blur(input)
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(fakes.setWindowSize.calls).toHaveLength(0)
  })

  it("does not write into the field while the user types", async () => {
    const fakes = makeFakes()
    renderWithFakes(<GuessScreen />, fakes)
    const input = screen.getByLabelText("Bits the guesser sees (N)") as HTMLInputElement
    await waitFor(() => expect(input.value).toBe("8"))
    const nativeValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!
    const writes: Array<string> = []
    Object.defineProperty(input, "value", {
      configurable: true,
      get() { return nativeValue.get!.call(this) },
      set(text: string) { writes.push(text); nativeValue.set!.call(this, text) },
    })
    input.focus()
    for (const typed of ["1", "12", "123"]) {
      // The browser, not the page, changes the text of the field while the user types.
      nativeValue.set!.call(input, typed)
      fireEvent.input(input)
      await new Promise((resolve) => setTimeout(resolve, 20))
    }
    expect(writes).toEqual([])
    expect(input.value).toBe("123")
    expect(document.activeElement).toBe(input)
  })

  it("an empty field stays empty while typing", async () => {
    const fakes = makeFakes()
    renderWithFakes(<GuessScreen />, fakes)
    const input = screen.getByLabelText("Bits the guesser sees (N)") as HTMLInputElement
    await waitFor(() => expect(input.value).toBe("8"))
    fireEvent.change(input, { target: { value: "" } })
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(input.value).toBe("")
  })

  it("the window size input has min 1 and max 256", () => {
    renderWithFakes(<GuessScreen />)
    const input = screen.getByLabelText("Bits the guesser sees (N)")
    expect(input.getAttribute("min")).toBe("1")
    expect(input.getAttribute("max")).toBe("256")
  })

  it("the N field shows the current size and goes back to it after blur", async () => {
    const fakes = makeFakes()
    renderWithFakes(<GuessScreen />, fakes)
    const input = screen.getByLabelText("Bits the guesser sees (N)") as HTMLInputElement
    await waitFor(() => expect(input.value).toBe("8"))
    fireEvent.change(input, { target: { value: "300" } })
    fireEvent.blur(input)
    await waitFor(() => expect(fakes.setWindowSize.calls).toHaveLength(1))
    await waitFor(() => expect(input.value).toBe("8"))
    act(() => fakes.windowSize.push(256))
    await waitFor(() => expect(input.value).toBe("256"))
  })

  it("shows the status, score and last round from the observed values", async () => {
    const fakes = makeFakes()
    renderWithFakes(<GuessScreen />, fakes)
    act(() => {
      fakes.guessStatus.push({ _tag: "Ready" })
      fakes.score.push({ hits: 1, guessed: 2, total: 3, unguessed: 1, ratio: 0.5 })
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
