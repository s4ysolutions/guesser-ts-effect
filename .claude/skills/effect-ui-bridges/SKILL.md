---
name: effect-ui-bridges
description: Use when connecting Effect use cases to a UI, writing a React hook for a Stream (useObserve, useSyncExternalStore, StrictMode) or a command runner (useRun), or an EventTarget/DOM wrapper for observed state, or when UI commands race and lose updates.
---

# UI bridges: React and DOM (driving adapters)

State lives in the application layer. A bridge only **runs** use cases and shows results. The product passes finished `UseCase<C>` values plus a runner; the bridge never looks anything up by tag. Idea: vocabla-mill `frontend-usecase-airstream-bridge` and `frontend-store-and-rx` (language-neutral: UI owns no state, one fiber per subscription, interrupt on unmount). The code below is TS/Effect/React specific.

## The runner is the smallest part of `ManagedRuntime` (`bridge/runner.ts`)

```ts
export interface EffectRunner {
  readonly runFork: (effect: Effect.Effect<unknown, never, never>) => {
    readonly interruptUnsafe: () => void
  }
}
```

A real `ManagedRuntime` fits. Tests pass a fake.

## React: `useObserve` on `useSyncExternalStore` (`presentation-react/src/bridge/use-observe.ts`)

```ts
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
            Effect.sync(() => { latest = value; listeners.forEach((l) => l()) })),
        )
        return () => { listeners.delete(onChange); fiber.interruptUnsafe() }
      },
      getSnapshot: (): A | undefined => latest,
    }
  }, [runner, useCase])
  return useSyncExternalStore(store.subscribe, store.getSnapshot)
}
```

Why it looks like this:
- **Stable snapshot:** `getSnapshot` returns the stored `latest`, so React does not loop. Do not build a new object in it.
- **Subscribe forks, cleanup interrupts:** each subscribe has one matching interrupt, so StrictMode (subscribe, unsubscribe, subscribe) leaves one fiber. The Stream replays its current value and the store keeps `latest`, so there is no gap.
- **Generic over the command type `C`.** `UseCase<UseCaseCommand<Stream<A>>>` does not accept `UseCase<ObserveRounds>`: `UseCase` takes the command as a parameter (contravariant). So the parameter is `UseCase<C>` with `C extends UseCaseCommand<Stream<unknown>>`.
- The command is read once (it is data); the store is rebuilt only if runner or use case changes. Do not key on `JSON.stringify(command)`.
- `useRun(useCase)` returns `(command) => void` and calls `runner.runFork(useCase(command))`. Do not wait for it.

## DOM: `EventTarget` per state (`presentation-dom/src/bridge/observed-state.ts`)

`ObservedState<A> extends EventTarget` runs the Stream in a fiber, keeps `value`, dispatches `new CustomEvent("change", { detail: value })` for every value (first included), and has `dispose()` that sets a flag and interrupts. `DomRounds extends ObservedState<Rounds>` adds `press(bit)` and `reset()` that call `runner.runFork(useCases.pressBit(new PressBit({ bit })))`. Private fields use `#`. Stopping is explicit (`dispose()`), where React stops on unmount.

## Races: each command is its own fiber

Both bridges fork every command separately. Two fast presses run in parallel. Commands that read then write state, or send ordered requests, need the state-owned 1-permit lock (see `effect-usecase-command`, rules 8 and 9). The lock lives in the use case layer, not in the bridge, so both UIs are safe.

## Other rules

- The bridge sends what the user typed (`SetWindowSize({ n: 300 })`); the logic clamps. Drop only input that is not a number.
- Each presentation keeps its own copy of the use-case interface and copy strings. Products stay independent; the grouping ("press and reset change rounds") is written in each bridge.
- No `Rx`, `LiveValue`, `Command` or `Store` type.
- `GuessUseCases` is a record of finished `UseCase<C>` values that the product passes to the bridge. It is not the "object that holds a group of use cases" we avoid: it hides no dependencies (each use case was built in the product, with its own arguments) and it is the bridge's input, not a logic type.
- Known gaps: `useObserve` ignores a changed command; `useRun` fibers outlive unmount; a stream defect is silent.

## Red flags

- `useState` + `useEffect` with a `key` hack instead of a stable store.
- UI code that clamps, validates, or keeps its own copy of state.
- A lock inside the hook.
