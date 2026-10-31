import { useMemo, useRef, useSyncExternalStore } from "react"
import { Effect, Stream } from "effect"
import type { ResponseOf, UseCase, UseCaseCommand } from "@guess/core"
import { useBridge } from "./provider.tsx"

type ValueOf<S> = S extends Stream.Stream<infer A, never, never> ? A : never

/**
 * Shows the latest value of a use case that returns a Stream.
 * Returns `undefined` until the first value arrives.
 *
 * StrictMode: React subscribes, unsubscribes and subscribes again. `subscribe` forks
 * one consumer fiber and the cleanup function interrupts it, so every subscribe has
 * exactly one matching interrupt. The Stream replays its current value on each new
 * subscription, and the store keeps the last value, so the second subscribe shows no gap.
 *
 * The command is read once, when the store is made (it is data and does not change).
 * The store is made again only when the runner or the use case changes.
 */
export const useObserve = <C extends UseCaseCommand<Stream.Stream<unknown>>>(
  useCase: UseCase<C>,
  command: C,
): ValueOf<ResponseOf<C>> | undefined => {
  type A = ValueOf<ResponseOf<C>>
  const { runner } = useBridge()
  const commandRef = useRef(command)
  const store = useMemo(() => {
    let latest: A | undefined
    const listeners = new Set<() => void>()
    return {
      subscribe: (onChange: () => void): (() => void) => {
        listeners.add(onChange)
        const fiber = runner.runFork(
          Stream.runForEach(useCase(commandRef.current) as Stream.Stream<A>, (value) =>
            Effect.sync(() => {
              latest = value
              listeners.forEach((listener) => listener())
            })),
        )
        return () => {
          listeners.delete(onChange)
          fiber.interruptUnsafe()
        }
      },
      getSnapshot: (): A | undefined => latest,
    }
  }, [runner, useCase])
  return useSyncExternalStore(store.subscribe, store.getSnapshot)
}
