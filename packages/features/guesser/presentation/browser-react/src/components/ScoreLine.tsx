import type { Score } from "@guess/guesser-application"
import { noGuessText, scoreText } from "@guess/guesser-state"

export const ScoreLine = (props: { readonly score: Score }) => {
  const noGuess = noGuessText(props.score)
  return (
    <div>
      <p>{scoreText(props.score)}</p>
      {noGuess === null ? null : <p>{noGuess}</p>}
    </div>
  )
}
