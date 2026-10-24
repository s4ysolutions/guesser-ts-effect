import type { GuessStatus } from "@guess/guesser-application"
import type { Round, Score } from "@guess/interaction-application"

export const statusText = (status: GuessStatus): string => {
  switch (status._tag) {
    case "Idle":
      return "Guesser needs at least one bit"
    case "Thinking":
      return "Guesser is thinking…"
    case "Ready":
      return "Guesser is ready"
    case "Failed":
      return `Guesser failed: ${status.message}`
  }
}

export const scoreText = (score: Score): string =>
  `Guesser guessed ${score.hits} of ${score.guessed} (${Math.round(score.ratio * 100)}%)`

/** Null when every round got a guess, so the line can be left out. */
export const noGuessText = (score: Score): string | null => {
  const n = score.total - score.guessed
  if (n <= 0) return null
  if (n === 1) return "1 round without a guess"
  return `${n} rounds without a guess`
}

export const lastRoundText = (round: Round): string =>
  `You: ${round.bit} · Guess: ${round.guess ?? "none"} · ${
    round.hit === null ? "no guess" : round.hit ? "hit" : "miss"
  }`
