export interface Score {
  readonly hits: number
  readonly guessed: number
  readonly total: number
  /** Rounds that got no guess: `total - guessed`. */
  readonly unguessed: number
  readonly ratio: number
}
