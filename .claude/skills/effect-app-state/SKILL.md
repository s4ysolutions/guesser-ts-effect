---
name: effect-app-state
description: Use when deciding where UI state lives in a TypeScript + Effect app, whether to hold it in a SubscriptionRef service or behind a repository port, how to load and save it, or how to hide a state service's internals.
---

# State in the application layer

Language-neutral idea: UI state belongs to the application, one owner per state; a port is for a real choice of technology. From vocabla-mill `frontend-store-and-rx` and `static-data-memory-adapter`. `SubscriptionRef`, `Context.Service`, `FiberHandle` are Effect 4.0.6.

## Live state = a `Context.Service` holding `SubscriptionRef`s (`guesser/application/src/state.ts`)

```ts
// The shape is internal to this package: only its use cases read or write it.
export class GuessState extends Context.Service<GuessState, {
  readonly status: SubscriptionRef.SubscriptionRef<InternalStatus>
  readonly windowSize: SubscriptionRef.SubscriptionRef<number>
  readonly lastBits: SubscriptionRef.SubscriptionRef<Bits>
  readonly fiber: FiberHandle.FiberHandle<void, never>
  readonly lock: Semaphore.Semaphore
  readonly storage: Storage | undefined
}>()("GuessState") { static layer(...) { /* Layer.effect, makes refs, fiber, lock */ } }
```

- It is **not a port**. No second implementation is expected.
- Use cases take `GuessState["Service"]` as a constructor argument.
- The state owns its **lock** (1-permit `Semaphore`) and any **fiber handle**. See `effect-usecase-command`.
- Observe use cases return `SubscriptionRef.changes(ref)` (current value first). Map internal to public shape in the use case: `toPublic` drops the guess from `Ready`, so the UI cannot show it before the press.
- **Internals are hidden by convention only.** `GuessState["Service"]` is a structural type; any code that has the value can read the refs. We keep "only this package's use cases touch it" by index.ts exports (state shape is exported, internals like `startGuess` are not) and review. There is no compiler guard.

The state loads once at start (`RoundsState.layer` calls `repository.load` inside `Layer.effect`), then lives in memory in the ref. Use cases save after each change. Observe never reads the repository. A save failure is handled inside the adapter (it logs a warning; `save` has error type `never`), so the UI is not blocked by storage.

## Repository port only where technology can change (`interaction`)

`RoundsRepository { load: Effect<Rounds>; save(rounds): Effect<void> }` is in the domain. `RoundsState.layer({ repository })` loads once at start; `PressBit` saves after each change. `load` has error type `never`: the adapter turns decode failure into empty rounds plus a backup key (history is never wiped without a copy).

## When a port is ceremony

`GuessState` in `guesser` has only a tiny storage use (window size N in `localStorage`), read with a `try` and a default, passed as `options.storage` for tests. A full repository port for one number would be ceremony. A port pays when there are two real technologies or you need to fake slow, failing IO in tests. Ask: "what second implementation would I write?" If none, no port.

## Red flags

- State in a React `useState` or a DOM object that the other UI needs too.
- A use case writing a ref that another feature owns.
- A `Layer` that is not needed: see `when-to-use-layer`.
