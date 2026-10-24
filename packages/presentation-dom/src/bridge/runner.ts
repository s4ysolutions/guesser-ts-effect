import type { Effect } from "effect"

/**
 * The smallest part of `ManagedRuntime` the bridge needs: start an Effect in the
 * background and get a handle that can stop it. A real `ManagedRuntime` fits.
 */
export interface EffectRunner {
  readonly runFork: (effect: Effect.Effect<unknown, never, never>) => {
    readonly interruptUnsafe: () => void
  }
}
