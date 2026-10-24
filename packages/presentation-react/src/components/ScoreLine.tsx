import type { Score } from "@guess/interaction-application"
import { noGuessText, scoreText } from "../copy.ts"

export const ScoreLine = (props: { readonly score: Score }) => {
  const noGuess = noGuessText(props.score)
  return (
    <div>
      <p>{scoreText(props.score)}</p>
      {noGuess === null ? null : <p>{noGuess}</p>}
    </div>
  )
}
