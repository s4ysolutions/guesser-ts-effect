import type { Rounds } from "../vo/round.ts"
import type { Score } from "../vo/score.ts"

export const scoreOf = (rounds: Rounds): Score => {
  let hits = 0
  let guessed = 0
  for (const round of rounds) {
    if (round.hit === null) continue
    guessed += 1
    if (round.hit) hits += 1
  }
  return {
    hits,
    guessed,
    total: rounds.length,
    unguessed: rounds.length - guessed,
    ratio: guessed === 0 ? 0 : hits / guessed,
  }
}
