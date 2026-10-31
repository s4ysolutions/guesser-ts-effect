import { Effect } from "effect"
import { lastN } from "@guess/core"
import type { Bits } from "@guess/core"
import { progressAfterFailure, progressAfterSuccess } from "../operations/guess-progress.ts"
import type { GuessGateway } from "../ports/guess-gateway.ts"
import type { GuessProgress } from "../vo/guess-progress.ts"

// Asks the gateway for a guess from the last `n` bits. A failure becomes a Failed progress.
export const fetchGuess = (gateway: GuessGateway, bits: Bits, n: number): Effect.Effect<GuessProgress> =>
  gateway.guess(lastN(bits, n)).pipe(
    Effect.match({ onSuccess: progressAfterSuccess, onFailure: progressAfterFailure }),
  )
