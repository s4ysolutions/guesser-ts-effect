import { Context, Effect, FiberHandle, Layer, Semaphore, SubscriptionRef } from "effect"
import type { Bits } from "@guess/core"
import { IDLE } from "@guess/guesser-domain"
import type { GuessProgress, WindowSizeRepository } from "@guess/guesser-domain"

// The shape is internal to this package: only its use cases read or write it.
export class GuessState extends Context.Service<GuessState, {
  readonly status: SubscriptionRef.SubscriptionRef<GuessProgress>
  readonly windowSize: SubscriptionRef.SubscriptionRef<number>
  readonly lastBits: SubscriptionRef.SubscriptionRef<Bits>
  readonly fiber: FiberHandle.FiberHandle<void, never>
  // One permit: guess requests run one at a time (not re-entrant).
  readonly lock: Semaphore.Semaphore
}>()("GuessState") {
  static layer(deps: { readonly windowSizeRepository: WindowSizeRepository }): Layer.Layer<GuessState> {
    return Layer.effect(
      GuessState,
      Effect.gen(function*() {
        const status = yield* SubscriptionRef.make<GuessProgress>(IDLE)
        const windowSize = yield* SubscriptionRef.make(yield* deps.windowSizeRepository.load)
        const lastBits = yield* SubscriptionRef.make<Bits>([])
        // Released with the layer's scope: interrupts a running guess.
        const fiber = yield* FiberHandle.make<void, never>()
        const lock = yield* Semaphore.make(1)
        return { status, windowSize, lastBits, fiber, lock }
      }),
    )
  }
}
