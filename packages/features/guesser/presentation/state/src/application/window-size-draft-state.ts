import { Context, Effect, Layer, SubscriptionRef } from "effect"

// The shape is internal to this package: only its use cases read or write it.
export class WindowSizeDraftState extends Context.Service<WindowSizeDraftState, {
  // The text in the size field while the user types. null: no edit is in progress.
  readonly draft: SubscriptionRef.SubscriptionRef<string | null>
}>()("WindowSizeDraftState") {
  static layer(): Layer.Layer<WindowSizeDraftState> {
    return Layer.effect(
      WindowSizeDraftState,
      Effect.gen(function*() {
        const draft = yield* SubscriptionRef.make<string | null>(null)
        return { draft }
      }),
    )
  }
}
