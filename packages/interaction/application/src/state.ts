import { Context, Effect, Layer, SubscriptionRef } from "effect"
import type { Rounds, RoundsRepository } from "@guess/interaction-domain"

// The shape is internal to this package: only its use cases read or write it.
export class RoundsState extends Context.Service<RoundsState, {
  readonly rounds: SubscriptionRef.SubscriptionRef<Rounds>
}>()("RoundsState") {
  static layer(deps: { readonly repository: RoundsRepository }): Layer.Layer<RoundsState> {
    return Layer.effect(
      RoundsState,
      Effect.gen(function*() {
        const rounds = yield* SubscriptionRef.make(yield* deps.repository.load)
        return { rounds }
      }),
    )
  }
}
