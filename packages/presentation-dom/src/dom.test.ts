import { Stream } from "effect"
import { afterEach, describe, expect, it } from "vitest"
import { ObserveRounds } from "@guess/interaction-application"
import type { Round, Rounds } from "@guess/interaction-application"
import { lastRoundText } from "./copy.ts"
import { DomRounds, mountGuessScreen, ObservedState } from "./index.ts"
import { makeFakes, makeRunner } from "./test-support.ts"

const until = async (check: () => boolean): Promise<void> => {
  const deadline = Date.now() + 2000
  while (!check()) {
    if (Date.now() > deadline) throw new Error("condition not met in time")
    await new Promise((resolve) => setTimeout(resolve, 5))
  }
}

afterEach(() => {
  document.body.innerHTML = ""
})

describe("ObservedState", () => {
  it("change event gives the current value first, then changes", async () => {
    const fakes = makeFakes()
    const runner = makeRunner()
    const state = new DomRounds(runner, fakes.useCases)
    const seen: Array<Rounds> = []
    state.addEventListener("change", (event) => seen.push((event as CustomEvent<Rounds>).detail))
    await until(() => state.value !== undefined)
    expect(state.value).toEqual([])
    const round: Round = { bit: 1, guess: null, hit: null }
    fakes.rounds.push([round])
    await until(() => seen.length >= 2 || state.value?.length === 1)
    expect(state.value).toEqual([round])
    expect(seen.at(-1)).toEqual([round])
    state.dispose()
    await runner.dispose()
  })

  it("dispose stops the fiber", async () => {
    const fakes = makeFakes()
    const runner = makeRunner()
    const state = new ObservedState<Rounds>(runner, fakes.useCases.observeRounds(new ObserveRounds()))
    await until(() => fakes.subscribers.live === 1)
    state.dispose()
    await until(() => fakes.subscribers.live === 0)
    fakes.rounds.push([{ bit: 0, guess: null, hit: null }])
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(state.value).toEqual([])
    await runner.dispose()
  })

  it("is an EventTarget", () => {
    const runner = makeRunner()
    const state = new ObservedState<number>(runner, Stream.make(1))
    expect(state).toBeInstanceOf(EventTarget)
    state.dispose()
  })
})

const setup = async () => {
  const fakes = makeFakes()
  const runner = makeRunner()
  const root = document.createElement("div")
  document.body.append(root)
  const unmount = mountGuessScreen(root, runner, fakes.useCases)
  await until(() => fakes.subscribers.live === 4)
  return { fakes, runner, root, unmount }
}

const button = (root: HTMLElement, name: string): HTMLButtonElement => {
  const found = [...root.querySelectorAll("button")].find((b) => b.textContent === name)
  if (!found) throw new Error(`no button ${name}`)
  return found
}

const input = (root: HTMLElement): HTMLInputElement => {
  const found = root.querySelector("input")
  if (!found) throw new Error("no input")
  return found
}

describe("guess screen", () => {
  it("screen renders and reacts", async () => {
    const { fakes, root, unmount } = await setup()
    button(root, "1").click()
    await until(() => fakes.pressBit.calls.length === 1)
    expect(fakes.pressBit.calls[0]?.bit).toBe(1)
    button(root, "Reset").click()
    await until(() => fakes.resetRounds.calls.length === 1)

    const round: Round = { bit: 1, guess: 0, hit: false }
    fakes.rounds.push([round])
    await until(() => root.textContent?.includes(lastRoundText(round)) === true)
    expect([...root.querySelectorAll("p")].map((p) => p.textContent)).toContain(lastRoundText(round))
    unmount()
  })

  it("shows status, score, history classes and the window size", async () => {
    const { fakes, root, unmount } = await setup()
    await until(() => root.querySelector('[role="status"]')?.textContent === "Guesser needs at least one bit")
    fakes.guessStatus.push({ _tag: "Ready" })
    await until(() => root.querySelector('[role="status"]')?.textContent === "Guesser is ready")
    fakes.score.push({ hits: 1, guessed: 2, total: 3, ratio: 0.5 })
    await until(() => root.textContent?.includes("Guesser guessed 1 of 2 (50%)") === true)
    expect(root.textContent).toContain("1 round without a guess")
    const rounds: Rounds = Array.from({ length: 45 }, (_, i): Round =>
      i === 44 ? { bit: 0, guess: 1, hit: false } : i === 43 ? { bit: 1, guess: 1, hit: true } : { bit: 1, guess: null, hit: null })
    fakes.rounds.push(rounds)
    await until(() => root.querySelectorAll(".history li").length === 40)
    const cells = [...root.querySelectorAll(".history li")]
    expect(cells.at(-1)?.className).toBe("miss")
    expect(cells.at(-2)?.className).toBe("hit")
    expect(cells[0]?.className).toBe("none")
    await until(() => input(root).value === "8")
    unmount()
  })

  it("keys 0 and 1 press; other keys, auto-repeat and typing in N do not", async () => {
    const { fakes, root, unmount } = await setup()
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "0" }))
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }))
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "1", repeat: true }))
    input(root).dispatchEvent(new KeyboardEvent("keydown", { key: "1", bubbles: true }))
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "1" }))
    await until(() => fakes.pressBit.calls.length >= 2)
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(fakes.pressBit.calls.map((c) => c.bit)).toEqual([0, 1])
    unmount()
  })

  it("keys with Ctrl, Meta or Alt do not press", async () => {
    const { fakes, unmount } = await setup()
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "0", ctrlKey: true }))
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "0", metaKey: true }))
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "1", altKey: true }))
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "1" }))
    await until(() => fakes.pressBit.calls.length >= 1)
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(fakes.pressBit.calls.map((c) => c.bit)).toEqual([1])
    unmount()
  })

  it("Enter in the N field leaves the field and sends N", async () => {
    const { fakes, root, unmount } = await setup()
    const n = input(root)
    n.focus()
    n.value = "12"
    n.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }))
    await until(() => fakes.setWindowSize.calls.length === 1)
    expect(fakes.setWindowSize.calls[0]?.n).toBe(12)
    expect(document.activeElement).not.toBe(n)
    unmount()
  })

  it("unmount removes the key listener and stops every fiber", async () => {
    const { fakes, root, unmount } = await setup()
    unmount()
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "1" }))
    await until(() => fakes.subscribers.live === 0)
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(fakes.pressBit.calls).toHaveLength(0)
    expect(root.childElementCount).toBe(0)
  })

  it("N input has bounds, sends the typed number on blur and resets to the current size", async () => {
    const { fakes, root, unmount } = await setup()
    const n = input(root)
    expect(n.min).toBe("1")
    expect(n.max).toBe("256")
    expect(root.querySelector("label")?.textContent).toContain("Bits the guesser sees (N)")
    n.value = "300"
    n.dispatchEvent(new Event("input", { bubbles: true }))
    n.dispatchEvent(new FocusEvent("blur"))
    await until(() => fakes.setWindowSize.calls.length === 1)
    expect(fakes.setWindowSize.calls[0]?.n).toBe(300)
    expect(n.value).toBe("8")
    n.value = ""
    n.dispatchEvent(new FocusEvent("blur"))
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(fakes.setWindowSize.calls).toHaveLength(1)
    expect(n.value).toBe("8")
    fakes.windowSize.push(12)
    await until(() => n.value === "12")
    unmount()
  })
})
