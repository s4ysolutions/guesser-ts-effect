---
name: naming-without-false-hints
description: Use when naming a new type, hook, class or file in a TypeScript + Effect app, especially ViewModel, Store, Service, View, Rx, LiveValue, or when a reviewer says a name suggests something the code does not do.
---

# Names that do not lie

A name is a promise about shape and lifetime. Idea from vocabla-mill `frontend-store-and-rx` and `naming-types-precisely`; the words below are about this stack.

| Avoid | Why | Use instead (in this repo) |
|---|---|---|
| `ViewModel` | Suggests a per-screen object with its own state. Here state is owned by application services and the UI has none. | the bridge entry: `DomRounds`, `useRounds` |
| `Store` | Suggests a Redux-style container the UI owns. Our state is a `SubscriptionRef` in application. | `RoundsState`, `GuessState` |
| `Service` | In Effect it means a `Context.Service` tag. Only the two state classes use it. Use cases and adapters are not services. | `make…` use case, `…Gateway`, `…Repository` |
| `View` for a reactive value | A view is something drawn. A value that changes is observed. | the `ObserveX` command; "screen" or "component" for drawn things |
| `Rx`, `LiveValue` | Stream and Effect already are those shapes. A grouping type only existed to keep two UIs equal, and the products should stay independent. | `Stream<A>` from an `ObserveX` command |
| `Request` (Effect's `Request.TaggedClass`) | Made for batching with resolvers; its response is a value, not a `Stream`. | `Data.TaggedClass` command |

## Rules for this stack

- State class: `<Thing>State` (`RoundsState`), a `Context.Service`. DOM wrapper: `Dom<Thing>` (`DomRounds`). React hook: `use<Thing>` (`useRounds`).
- Command class and use case maker share one stem: `PressBit` and `makePressBit`. Do not add `Handler` or `UseCase` to either.
- A stream is named by its observe command (`ObserveRounds`), never by a type like `RoundsRx`.
- `Service` is only Effect's `Context.Service`, used by `GuessState` and `RoundsState`.

- Commands are verbs (`PressBit`, `ResetRounds`); observe commands start with `Observe`.
- Make functions are `make<Command>`; the class and the maker share the stem.
- A name with a contrast word ("experienced", "simple") says nothing; say what is true.
- Two types may not share a name across layers; alias on import if needed (`import type { RequestGuess as RequestGuessCommand }` where a value and a type clash).
