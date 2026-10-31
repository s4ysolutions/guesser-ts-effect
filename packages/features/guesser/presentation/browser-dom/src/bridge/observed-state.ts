import { Effect, Stream } from "effect"
import type { EffectRunner } from "./runner.ts"

/**
 * Runs a Stream in the background and shows its latest value as a native `EventTarget`.
 * Every value, the first one included, is announced with a `change` CustomEvent
 * that carries the value in `detail`. `value` is `undefined` until the first one.
 * `dispose()` stops the background fiber; no more events come after it.
 */
export class ObservedState<A> extends EventTarget {
  #value: A | undefined
  #disposed = false
  readonly #fiber: { readonly interruptUnsafe: () => void }

  constructor(runner: EffectRunner, stream: Stream.Stream<A, never, never>) {
    super()
    this.#fiber = runner.runFork(
      Stream.runForEach(stream, (value) =>
        Effect.sync(() => {
          if (this.#disposed) return
          this.#value = value
          this.dispatchEvent(new CustomEvent("change", { detail: value }))
        })),
    )
  }

  get value(): A | undefined {
    return this.#value
  }

  dispose(): void {
    this.#disposed = true
    this.#fiber.interruptUnsafe()
  }
}
