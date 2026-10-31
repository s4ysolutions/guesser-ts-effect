import { useEffect } from "react"
import type { Bit } from "@guess/core"
import { bitForKey } from "@guess/guesser-state"
import { useGuessStatus } from "../hooks/use-guess-status.ts"
import { useRounds } from "../hooks/use-rounds.ts"
import { useScore } from "../hooks/use-score.ts"
import { useWindowSizeDraft } from "../hooks/use-window-size-draft.ts"
import { BitButtons } from "./BitButtons.tsx"
import { History } from "./History.tsx"
import { LastRound } from "./LastRound.tsx"
import { ScoreLine } from "./ScoreLine.tsx"
import { StatusLine } from "./StatusLine.tsx"
import { WindowSizeInput } from "./WindowSizeInput.tsx"

/** Adds the key listener. Which keys press a bit is decided in the state package. */
const useBitKeys = (press: (bit: Bit) => void) => {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const bit = bitForKey({
        key: event.key,
        repeat: event.repeat,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        altKey: event.altKey,
        inInput: event.target instanceof HTMLInputElement,
      })
      if (bit !== null) press(bit)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [press])
}

export const GuessScreen = () => {
  const [rounds, actions] = useRounds()
  const score = useScore()
  const status = useGuessStatus()
  const [sizeText, sizeActions] = useWindowSizeDraft()
  useBitKeys(actions.press)

  return (
    <main>
      <BitButtons onPress={actions.press} />
      {status === undefined ? null : <StatusLine status={status} />}
      {rounds === undefined ? null : <LastRound round={rounds.at(-1)} />}
      {score === undefined ? null : <ScoreLine score={score} />}
      {rounds === undefined ? null : <History rounds={rounds} />}
      <WindowSizeInput text={sizeText} onEdit={sizeActions.edit} onCommit={sizeActions.commit} />
      <button type="button" onClick={actions.reset}>
        Reset
      </button>
    </main>
  )
}
