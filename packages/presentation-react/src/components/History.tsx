import type { Round, Rounds } from "@guess/interaction-application"

const HISTORY_LENGTH = 40

const classOf = (round: Round): "hit" | "miss" | "none" => {
  if (round.hit === null) return "none"
  return round.hit ? "hit" : "miss"
}

/** The last 40 rounds, oldest on the left. */
export const History = (props: { readonly rounds: Rounds }) => (
  <ol className="history" aria-label="History">
    {props.rounds.slice(-HISTORY_LENGTH).map((round, index) => (
      <li key={index} className={classOf(round)}>
        {round.bit}
      </li>
    ))}
  </ol>
)
