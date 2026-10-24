---
name: effect-feature-layout
description: Use when adding a feature to a TypeScript + Effect app, deciding where a type, port, state service, use case, adapter or UI piece belongs, or checking a change for layer violations such as an adapter import in a domain package.
---

# Feature layout: domain / application / adapters / presentation / product

Language-neutral idea from vocabla-mill `hexagonal-feature-layout`: the domain knows nothing about technology; adapters implement ports; the application layer connects them. Folder names and Effect types below are TS/Effect specific.

## Where things go (from `guesser` and `interaction`)

| Layer | Holds | Example |
|---|---|---|
| `core` | shared kernel: `Bit`, `Bits`, `UseCaseCommand`, `UseCase` | `packages/core/src/usecase.ts` |
| `<feature>/domain` | plain types, tagged errors, **port** interfaces | `GuessGateway`, `Guess`, `RoundsRepository` |
| `<feature>/application` | state service + its Layer, commands, `make…` use cases | `GuessState`, `makePressBit` |
| `<feature>/adapter-*` | a port implementation, plain `make…` function | `makeLongestMatchGateway`, `makeLocalStorageRoundsRepository` |
| `presentation-*` | bridge to the UI framework + screens | `useObserve`, `ObservedState` |
| `product-*` | composition root, no business logic | `main.tsx`, `main.ts` |

## Paths and names

`packages/<feature>/<layer>/` is package `@guess/<feature>-<layer>` (`packages/guesser/application` = `@guess/guesser-application`). Each package has one `src/index.ts` that is its only export. Tests sit next to the code (`src/*.test.ts`). Command and maker share a file: `rounds/press-bit.ts` holds `PressBit` and `makePressBit`.

## Rules

1. **State the UI shows lives in application**, never in presentation. Two UIs need the same state. See `effect-app-state`.
2. **Domain imports only `core` and `effect`.** Ports are plain TS interfaces whose methods return `Effect` (error type `never` when the failure is turned into state, as `RoundsRepository.load` does); errors are `Data.TaggedError`.
3. **Use cases of one state sit in one folder** (`rounds/` has `PressBit`, `ResetRounds`, `ObserveRounds`). The folder is the grouping; no grouping type.
4. **An application package re-exports, as types, every domain type its use cases return** (`export type { Round, Rounds, Score } from "@guess/interaction-domain"`). Presentation and products then import only `*-application`.
5. **One owner per state.** Only the owner's use cases write it. Another feature changes it by calling the owner's `UseCase<C>` (interaction calls guesser's `TakeGuess`, `RequestGuess`).
6. **Adapters are plain functions** with no tag or Layer (`when-to-use-layer`). They touch browser globals lazily inside `Effect.sync`.
7. **Presentation never imports adapters; products wire them.**
8. Failures become state; see `effect-usecase-command`.

## Adding a feature: order

domain types and ports -> adapter + its test -> state service (if needed) -> commands and use cases (one file each) -> index.ts exports -> bridge entries in each presentation -> product wiring. Package rules: `package-per-layer`.

## Red flags

- A type in domain that mentions `localStorage`, `fetch`, React.
- A presentation package that holds the only copy of a value.
- A use case that imports an adapter. (One deliberate exception: `adapter-wiring-modes`.)
