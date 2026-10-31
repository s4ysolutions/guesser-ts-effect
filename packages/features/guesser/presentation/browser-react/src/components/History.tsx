import type { Rounds } from "@guess/guesser-application"
import { recentRounds, roundClass } from "@guess/guesser-state"

/** The last 40 rounds, oldest on the left. */
export const History = (props: { readonly rounds: Rounds }) => (
  <ol className="history" aria-label="History">
    {recentRounds(props.rounds).map((round, index) => (
      <li key={index} className={roundClass(round)}>
        {round.bit}
      </li>
    ))}
  </ol>
)
