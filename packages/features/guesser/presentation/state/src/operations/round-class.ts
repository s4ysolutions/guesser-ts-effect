import type { Round } from "@guess/guesser-application"

/** The style class of a history cell: hit, miss, or none when the round got no guess. */
export const roundClass = (round: Round): "hit" | "miss" | "none" => {
  if (round.hit === null) return "none"
  return round.hit ? "hit" : "miss"
}
