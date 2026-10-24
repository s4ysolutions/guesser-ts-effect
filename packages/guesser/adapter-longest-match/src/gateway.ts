import { Effect } from "effect"
import type { Bits } from "@guess/core"
import type { GuessGateway } from "@guess/guesser-domain"
import { predictNext } from "./predict.ts"

export const makeLongestMatchGateway = (): GuessGateway => ({
  guess: (lastBits: Bits) => Effect.sync(() => predictNext(lastBits)),
})
