import type { Rounds } from "./round.ts"

export interface Score {
  readonly hits: number
  readonly guessed: number
  readonly total: number
  readonly ratio: number
}

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
    ratio: guessed === 0 ? 0 : hits / guessed,
  }
}
