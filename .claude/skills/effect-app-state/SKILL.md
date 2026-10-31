---
name: effect-app-state
description: Use when deciding where state lives in a TypeScript + Effect app, whether to hold it in a SubscriptionRef service or behind a repository port, how to load and save it, where UI-only state goes, or how to hide a state service's internals.
---

# State: application, domain, ports and presentation/state

One owner per state. Rules about the state go in the domain (`hexagonal-layering`). `SubscriptionRef`, `Context.Service` and `FiberHandle` are Effect 4.0.6.

| Kind | Lives in | Example |
|---|---|---|
| Live game state | `application`, a `Context.Service` of `SubscriptionRef`s | `GuessState`, `RoundsState` |
| Rules about that state | `domain`, operations (pure) and workflows (with ports) | `clampWindowSize`, `progressForRequest`, `takeGuess`, `recordRound` |
| Saved copy | behind a port declared in `domain` | `RoundsRepository`, `WindowSizeRepository` |
| UI-only state | `presentation/state`, same service shape | `WindowSizeDraftState` |

## Live state: a `Context.Service` holding `SubscriptionRef`s (`logic/application/src/guess/state.ts`)

```ts
// The shape is internal to this package: only its use cases read or write it.
export class GuessState extends Context.Service<GuessState, {
  readonly status: SubscriptionRef.SubscriptionRef<GuessProgress>
  readonly windowSize: SubscriptionRef.SubscriptionRef<number>
  readonly lastBits: SubscriptionRef.SubscriptionRef<Bits>
  readonly fiber: FiberHandle.FiberHandle<void, never>
  readonly lock: Semaphore.Semaphore
}>()("GuessState") {
  static layer(deps: { readonly windowSizeRepository: WindowSizeRepository }): Layer.Layer<GuessState> { /* Layer.effect */ }
}
```

- It is **not a port**. No second implementation is expected.
- The state holds values only. The rules that change them (`progressForRequest`, `takeGuess`, `changeWindowSize`) are domain operations and workflows that the use cases call. A state file with rules or storage calls is a red flag.
- Use cases take `GuessState["Service"]` as a constructor argument.
- The state owns its **lock** (1-permit `Semaphore`) and any **fiber handle**. See `effect-usecase-command`.
- Observe use cases return `SubscriptionRef.changes(ref)` (current value first). When the UI may not see everything, the observe use case calls a domain function: `makeObserveGuessStatus` maps `GuessProgress` through `publicStatus`, which drops the guess so the UI cannot show it before the press.
- **Internals are hidden by convention only.** `GuessState["Service"]` is a structural type; any code that has the value can read the refs. "Only this package's use cases touch it" is kept by `index.ts` exports (`startGuess` is not exported) and review. There is no compiler guard.

## Persistence goes through ports

Both saved values have a port in the domain, an adapter in `adapter-local-storage`, and the product passes the adapter in (`adapter-wiring-modes`):

- `RoundsRepository { load: Effect<Rounds>; save(rounds): Effect<void> }`. `RoundsState.layer({ repository })` loads once at start. `PressBit` saves through the `recordRound` workflow and writes the ref with the rounds it returns. `ResetRounds` calls `repository.save([])` itself: one port call, no rule.
- `WindowSizeRepository { load: Effect<number>; save(n): Effect<void> }`. `GuessState.layer({ windowSizeRepository })` loads once at start. `SetWindowSize` saves through the `changeWindowSize` workflow, then writes the ref.

The state loads once, then lives in memory in the ref. Observe never reads the repository. `load` and `save` have error type `never`: the adapter handles bad data (rounds: empty list plus a backup key; size: the default) and failed writes (ignored), so storage never blocks the UI. Each rule for a stored value (is `7` a valid size?) is a domain operation the adapter calls (`isWindowSize`).

Ask before adding a port: "what second implementation, or fake for tests, would I write?" Here the answer is a fake storage for tests and a different store later, and the port also keeps `localStorage` out of application.

## UI-only state: `presentation/state`

State that only shapes one screen, and that the game does not need to keep working, goes in `@guess/guesser-state`. It has the same shape as application state: a `Context.Service` with a `SubscriptionRef`, a Layer, and `Command` + `UseCase<C>` use cases. Both toolkits share it, so the logic is written once.

Example: `WindowSizeDraftState` holds `SubscriptionRef<string | null>`, the text in the size field. `null` means no edit is in progress.

- `EditWindowSizeDraft({ text })` sets the draft.
- `CommitWindowSizeDraft` takes the draft and clears it in one step (`getAndSet(null)`), parses it with `parseWindowSizeDraft` (empty text gives `null`; other text gives `Number(text)`, NaN included), and passes a number on to `setWindowSize` as typed. The domain clamps it and is the only place that rejects NaN. With no draft it sends nothing.
- `ObserveWindowSizeDraft` emits the draft if there is one, otherwise the current size as text.

The draft is not game state: if it is lost, the game still works. The window size itself is game state, so it stays in `GuessState`. A value the game needs must not move into `presentation/state`.

## Red flags

- State in a React `useState` or a DOM object that the other UI needs too.
- A use case writing a ref that another feature owns.
- A `Layer` that is not needed: see `when-to-use-layer`.
- `localStorage` or another storage call inside a state service or use case.
