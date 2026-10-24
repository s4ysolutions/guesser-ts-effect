import { Context, Effect, FiberHandle, Layer, SubscriptionRef } from "effect"
import type { Bits } from "@guess/core"
import type { Guess, GuessFailed } from "@guess/guesser-domain"

export const WINDOW_SIZE_DEFAULT = 32
export const WINDOW_SIZE_MIN = 1
export const WINDOW_SIZE_MAX = 256
export const WINDOW_SIZE_KEY = "guess.windowSize"

export type InternalStatus =
  | { readonly _tag: "Idle" }
  | { readonly _tag: "Thinking" }
  | { readonly _tag: "Ready"; readonly guess: Guess }
  | { readonly _tag: "Failed"; readonly error: GuessFailed }

export const clampWindowSize = (n: number): number =>
  Math.min(WINDOW_SIZE_MAX, Math.max(WINDOW_SIZE_MIN, Math.round(n)))

const loadWindowSize = (storage: Storage | undefined): number => {
  try {
    const raw = storage?.getItem(WINDOW_SIZE_KEY)
    if (raw == null || !/^\d+$/.test(raw)) return WINDOW_SIZE_DEFAULT
    const n = Number(raw)
    return n >= WINDOW_SIZE_MIN && n <= WINDOW_SIZE_MAX ? n : WINDOW_SIZE_DEFAULT
  } catch {
    return WINDOW_SIZE_DEFAULT
  }
}

export const saveWindowSize = (storage: Storage | undefined, n: number): void => {
  try {
    storage?.setItem(WINDOW_SIZE_KEY, String(n))
  } catch {
    // Storage may be full or blocked. The size still works for this session.
  }
}

const defaultStorage = (): Storage | undefined => {
  try {
    return globalThis.localStorage
  } catch {
    return undefined
  }
}

// The shape is internal to this package: only its use cases read or write it.
export class GuessState extends Context.Service<GuessState, {
  readonly status: SubscriptionRef.SubscriptionRef<InternalStatus>
  readonly windowSize: SubscriptionRef.SubscriptionRef<number>
  readonly lastBits: SubscriptionRef.SubscriptionRef<Bits>
  readonly fiber: FiberHandle.FiberHandle<void, never>
  readonly storage: Storage | undefined
}>()("GuessState") {
  static layer(options?: { readonly storage?: Storage }): Layer.Layer<GuessState> {
    return Layer.effect(
      GuessState,
      Effect.gen(function*() {
        const storage = options?.storage ?? defaultStorage()
        const status = yield* SubscriptionRef.make<InternalStatus>({ _tag: "Idle" })
        const windowSize = yield* SubscriptionRef.make(loadWindowSize(storage))
        const lastBits = yield* SubscriptionRef.make<Bits>([])
        // Released with the layer's scope: interrupts a running guess.
        const fiber = yield* FiberHandle.make<void, never>()
        return { status, windowSize, lastBits, fiber, storage }
      }),
    )
  }
}
