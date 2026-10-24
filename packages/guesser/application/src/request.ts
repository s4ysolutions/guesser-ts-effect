import { Data, Effect, FiberHandle, SubscriptionRef } from "effect"
import { lastN } from "@guess/core"
import type { Bits, UseCase } from "@guess/core"
import { makeLongestMatchGateway } from "@guess/guesser-adapter-longest-match"
import type { GuessGateway } from "@guess/guesser-domain"
import type { GuessState } from "./state.ts"

export class RequestGuess extends Data.TaggedClass("RequestGuess")<{ readonly bits: Bits }> {
  declare readonly "~response"?: Effect.Effect<void>
}

// The unlocked body of RequestGuess. The caller must hold guessState.lock.
// Internal: not exported from index.ts.
export const startGuess = (
  guessState: GuessState["Service"],
  gateway: GuessGateway,
  bits: Bits,
): Effect.Effect<void> =>
  Effect.gen(function*() {
    yield* SubscriptionRef.set(guessState.lastBits, bits)
    // Wait for the old guess fiber to exit, so it cannot write a stale result.
    yield* FiberHandle.clear(guessState.fiber)
    if (bits.length === 0) {
      yield* SubscriptionRef.set(guessState.status, { _tag: "Idle" })
      return
    }
    const n = yield* SubscriptionRef.get(guessState.windowSize)
    yield* SubscriptionRef.set(guessState.status, { _tag: "Thinking" })
    yield* FiberHandle.run(
      guessState.fiber,
      gateway.guess(lastN(bits, n)).pipe(
        Effect.matchEffect({
          onSuccess: (guess) => SubscriptionRef.set(guessState.status, { _tag: "Ready", guess }),
          onFailure: (error) => SubscriptionRef.set(guessState.status, { _tag: "Failed", error }),
        }),
      ),
    )
  })

export const makeRequestGuess = (deps: {
  readonly guessState: GuessState["Service"]
  readonly gateway?: GuessGateway
}): UseCase<RequestGuess> => {
  const { guessState } = deps
  const gateway = deps.gateway ?? makeLongestMatchGateway()
  return (command) => guessState.lock.withPermits(1)(startGuess(guessState, gateway, command.bits))
}
