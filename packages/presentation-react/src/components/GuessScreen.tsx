import { useEffect } from "react"
import type { Bit } from "@guess/core"
import { useGuessStatus } from "../hooks/use-guess-status.ts"
import { useRounds } from "../hooks/use-rounds.ts"
import { useScore } from "../hooks/use-score.ts"
import { useWindowSize } from "../hooks/use-window-size.ts"
import { BitButtons } from "./BitButtons.tsx"
import { History } from "./History.tsx"
import { LastRound } from "./LastRound.tsx"
import { ScoreLine } from "./ScoreLine.tsx"
import { StatusLine } from "./StatusLine.tsx"
import { WindowSizeInput } from "./WindowSizeInput.tsx"

/** Keys 0 and 1 press a bit. Auto-repeat and typing in the N field do not. */
const useBitKeys = (press: (bit: Bit) => void) => {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.target instanceof HTMLInputElement) return
      if (event.key === "0") press(0)
      if (event.key === "1") press(1)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [press])
}

export const GuessScreen = () => {
  const [rounds, actions] = useRounds()
  const score = useScore()
  const status = useGuessStatus()
  const [windowSize, setWindowSize] = useWindowSize()
  useBitKeys(actions.press)

  return (
    <main>
      <BitButtons onPress={actions.press} />
      {status === undefined ? null : <StatusLine status={status} />}
      {rounds === undefined ? null : <LastRound round={rounds.at(-1)} />}
      {score === undefined ? null : <ScoreLine score={score} />}
      {rounds === undefined ? null : <History rounds={rounds} />}
      <WindowSizeInput size={windowSize} onChange={setWindowSize} />
      <button type="button" onClick={actions.reset}>
        Reset
      </button>
    </main>
  )
}
