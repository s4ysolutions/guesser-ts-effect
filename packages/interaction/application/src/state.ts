import { Context, Effect, Layer, Semaphore, SubscriptionRef } from "effect"
import type { Rounds, RoundsRepository } from "@guess/interaction-domain"

// The shape is internal to this package: only its use cases read or write it.
export class RoundsState extends Context.Service<RoundsState, {
  readonly rounds: SubscriptionRef.SubscriptionRef<Rounds>
  // Each round command holds this lock for its whole read, write and save.
  readonly lock: Semaphore.Semaphore
}>()("RoundsState") {
  static layer(deps: { readonly repository: RoundsRepository }): Layer.Layer<RoundsState> {
    return Layer.effect(
      RoundsState,
      Effect.gen(function*() {
        const rounds = yield* SubscriptionRef.make(yield* deps.repository.load)
        const lock = yield* Semaphore.make(1)
        return { rounds, lock }
      }),
    )
  }
}
