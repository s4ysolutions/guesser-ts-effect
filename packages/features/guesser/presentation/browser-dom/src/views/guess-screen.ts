import { WINDOW_SIZE_MAX, WINDOW_SIZE_MIN } from "@guess/guesser-application"
import type { Bit } from "@guess/core"
import { bitForKey, lastRoundText, noGuessText, recentRounds, roundClass, scoreText, statusText } from "@guess/guesser-state"
import type { GuessStatus, Round, Rounds, Score } from "@guess/guesser-application"
import { DomGuessStatus, DomRounds, DomScore, DomWindowSizeDraft } from "../bridge/dom-states.ts"
import type { GuessUseCases } from "../bridge/dom-states.ts"
import type { ObservedState } from "../bridge/observed-state.ts"
import type { EffectRunner } from "../bridge/runner.ts"

export type { GuessUseCases }

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

/** The last 40 rounds, oldest on the left. */
const history = (state: DomRounds): HTMLElement => {
  const list = element("ol", { className: "history" })
  list.setAttribute("aria-label", "History")
  bind<Rounds>(state, (rounds) => {
    list.replaceChildren(
      ...recentRounds(rounds).map((round) =>
        element("li", { className: roundClass(round), textContent: String(round.bit) })),
    )
  })
  return list
}

/**
 * Shows the draft text and sends events: typing edits the draft, blur commits it (Enter also leaves the field).
 * Parsing, clamping and rounding are not done here.
 */
const windowSizeField = (state: DomWindowSizeDraft): HTMLElement => {
  const input = element("input", { type: "number", min: String(WINDOW_SIZE_MIN), max: String(WINDOW_SIZE_MAX) })
  const label = element("label")
  label.append("Bits the guesser sees (N)", input)
  // The text comes back from a Stream, after the keystroke. Skip the write when it is already there:
  // a write would move the cursor and could clear text the browser shows but reports as "".
  bind<string>(state, (text) => { if (input.value !== text) input.value = text })
  input.addEventListener("input", () => state.edit(input.value))
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") input.blur()
  })
  input.addEventListener("blur", () => state.commit())
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
  const windowSize = new DomWindowSizeDraft(runner, useCases)

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

  // Which keys press a bit is decided in the state package.
  const onKeyDown = (event: KeyboardEvent) => {
    const bit = bitForKey({
      key: event.key,
      repeat: event.repeat,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      altKey: event.altKey,
      inInput: event.target instanceof HTMLInputElement,
    })
    if (bit !== null) rounds.press(bit)
  }
  window.addEventListener("keydown", onKeyDown)

  return () => {
    window.removeEventListener("keydown", onKeyDown)
    for (const state of [rounds, score, status, windowSize]) state.dispose()
    root.replaceChildren()
  }
}
