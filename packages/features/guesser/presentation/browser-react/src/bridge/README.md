# React bridge

This folder connects React components to the Effect use cases. It runs use cases and
shows their results. 

The product builds the use cases and the runner, and passes them to `GuessProvider`.
The bridge never looks anything up by tag, so it needs no Layer and no knowledge of adapters.

## Files

- `runner.ts`: `EffectRunner`, the smallest part of `ManagedRuntime` the bridge needs. A real runtime fits, and tests can pass a fake.
- `provider.tsx`: `GuessProvider` puts the runner and the use cases in a React context. `useUseCases` reads them.
- `use-observe.ts`: `useObserve` subscribes to a use case that returns a Stream. Each new value updates the component.
- `use-run.ts`: `useRun` returns a function that runs a command and does not wait for it.

## How components use the bridge

Components do not call `useObserve` and `useRun` directly. These two hooks are parts for the
feature hooks in `../hooks`, and components call the feature hooks.

The parts are separate because a use case does one thing: it either returns a Stream or runs a
command. A feature hook joins them into the usual React pair, `[state, actions]`:

```ts
const [rounds, { press, reset }] = useRounds()
const [text, { edit, commit }] = useWindowSizeDraft()
```

A feature hook builds the command objects, so components call `press(bit)`, not
`run(new PressBit({ bit }))`. It keeps `actions` in `useMemo`, so the object stays the same
between renders. State that the screen cannot change directly has no actions, so the hook
returns only the value, as in `useScore` and `useGuessStatus`.

## Approach

- **Reading:** `useObserve` uses `useSyncExternalStore`. Each subscribe starts one fiber and its cleanup stops that fiber, so React StrictMode leaves exactly one fiber running.
- **No flicker:** the store keeps the last value, and the Stream sends its current value to each new subscriber. The value is `undefined` only until the first one arrives.
- **Writing:** `useRun` starts each command in its own fiber, so two fast clicks run in parallel. Commands that must not overlap use a lock in the use case layer, not in the bridge.

## Known gaps

- `useObserve` reads the command once and ignores later changes.
- `useRun` fibers keep running after the component unmounts.
- An error that kills a Stream is not shown anywhere.
