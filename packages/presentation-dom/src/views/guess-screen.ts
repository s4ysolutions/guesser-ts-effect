import { WINDOW_SIZE_MAX, WINDOW_SIZE_MIN } from "@guess/guesser-application"
import type { Bit } from "@guess/core"
import type { Round, Rounds, Score } from "@guess/interaction-application"
import type { GuessStatus } from "@guess/guesser-application"
import { DomGuessStatus, DomRounds, DomScore, DomWindowSize } from "../bridge/dom-states.ts"
import type { GuessUseCases } from "../bridge/dom-states.ts"
import type { ObservedState } from "../bridge/observed-state.ts"
import type { EffectRunner } from "../bridge/runner.ts"
import { lastRoundText, noGuessText, scoreText, statusText } from "../copy.ts"

export type { GuessUseCases }

const HISTORY_LENGTH = 40

const element = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<HTMLElementTagNameMap[K]> = {},
): HTMLElementTagNameMap[K] => Object.assign(document.createElement(tag), props)

/** Calls `render` now if the state has a value, and again on every change. */
const bind = <A>(state: ObservedState<A>, render: (value: A) => void): void => {
  if (state.value !== undefined) render(state.value)
  state.addEventListener("change", (event) => render((event as CustomEvent<A>).detail))
}

const bitButtons = (press: (bit: Bit) => void): HTMLElement => {
  const box = element("div", { className: "bit-buttons" })
  for (const bit of [0, 1] as const) {
    const button = element("button", { type: "button", className: "bit-button", textContent: String(bit) })
    button.addEventListener("click", () => press(bit))
    box.append(button)
  }
  return box
}

const statusLine = (state: DomGuessStatus): HTMLElement => {
  const line = element("p")
  line.setAttribute("role", "status")
  bind<GuessStatus>(state, (status) => { line.textContent = statusText(status) })
  return line
}

const lastRoundLine = (state: DomRounds): HTMLElement => {
  const line = element("p")
  bind<Rounds>(state, (rounds) => {
    const round: Round | undefined = rounds.at(-1)
    line.textContent = round === undefined ? "" : lastRoundText(round)
    line.hidden = round === undefined
  })
  return line
}

const scoreLines = (state: DomScore): HTMLElement => {
  const box = element("div")
  bind<Score>(state, (score) => {
    const noGuess = noGuessText(score)
    const lines = [element("p", { textContent: scoreText(score) })]
    if (noGuess !== null) lines.push(element("p", { textContent: noGuess }))
    box.replaceChildren(...lines)
  })
  return box
}

const classOf = (round: Round): "hit" | "miss" | "none" => {
  if (round.hit === null) return "none"
  return round.hit ? "hit" : "miss"
}

/** The last 40 rounds, oldest on the left. */
const history = (state: DomRounds): HTMLElement => {
  const list = element("ol", { className: "history" })
  list.setAttribute("aria-label", "History")
  bind<Rounds>(state, (rounds) => {
    list.replaceChildren(
      ...rounds.slice(-HISTORY_LENGTH).map((round) =>
        element("li", { className: classOf(round), textContent: String(round.bit) })),
    )
  })
  return list
}

const sizeText = (size: number | undefined): string => (size === undefined ? "" : String(size))

/**
 * Edits N in the field. The value is sent when the field loses focus.
 * Clamping and rounding belong to SetWindowSize, so any number is sent as typed.
 * An empty or non-numeric text is dropped. Afterwards the field shows the current size.
 */
const windowSizeField = (state: DomWindowSize): HTMLElement => {
  const input = element("input", { type: "number", min: String(WINDOW_SIZE_MIN), max: String(WINDOW_SIZE_MAX) })
  const label = element("label")
  label.append("Bits the guesser sees (N)", input)
  input.value = sizeText(state.value)
  bind<number>(state, (size) => { input.value = sizeText(size) })
  input.addEventListener("blur", () => {
    const n = Number(input.value)
    if (input.value.trim() !== "" && !Number.isNaN(n)) state.set(n)
    input.value = sizeText(state.value)
  })
  return label
}

/**
 * Builds the guess screen inside `root` and starts the background fibers.
 * Returns a function that stops every fiber, removes the key listener and empties `root`.
 */
export const mountGuessScreen = (root: HTMLElement, runner: EffectRunner, useCases: GuessUseCases): (() => void) => {
  const rounds = new DomRounds(runner, useCases)
  const score = new DomScore(runner, useCases)
  const status = new DomGuessStatus(runner, useCases)
  const windowSize = new DomWindowSize(runner, useCases)

  const reset = element("button", { type: "button", textContent: "Reset" })
  reset.addEventListener("click", () => rounds.reset())

  const main = element("main")
  main.append(
    bitButtons((bit) => rounds.press(bit)),
    statusLine(status),
    lastRoundLine(rounds),
    scoreLines(score),
    history(rounds),
    windowSizeField(windowSize),
    reset,
  )
  root.replaceChildren(main)

  // Keys 0 and 1 press a bit. Auto-repeat and typing in the N field do not.
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.repeat || event.target instanceof HTMLInputElement) return
    if (event.key === "0") rounds.press(0)
    if (event.key === "1") rounds.press(1)
  }
  window.addEventListener("keydown", onKeyDown)

  return () => {
    window.removeEventListener("keydown", onKeyDown)
    for (const state of [rounds, score, status, windowSize]) state.dispose()
    root.replaceChildren()
  }
}
