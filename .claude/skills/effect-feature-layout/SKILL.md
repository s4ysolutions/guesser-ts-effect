---
name: effect-feature-layout
description: Use when adding a feature to a TypeScript + Effect app, deciding which folder or `@guess/...` package a type, port, state service, use case, adapter or UI piece goes in, or looking for the file name and order for a new feature.
---

# Feature layout: folders, packages and Effect types

**REQUIRED BACKGROUND:** hexagonal-layering. It has the rules: what each layer owns, the decision tests, the use case shape and the red flags. This skill only shows how those layers look in this repo.

## Folders and packages

```
packages/
  core/                          @guess/core
  features/<feature>/
    logic/
      domain/                    @guess/<feature>-domain
      application/               @guess/<feature>-application
      adapter-<tech>/            @guess/<feature>-adapter-<tech>
    presentation/
      state/                     @guess/<feature>-state
      browser-<toolkit>/         @guess/<feature>-browser-<toolkit>
  product-<toolkit>/             @guess/product-<toolkit>
```

The real feature is `guesser`, with `browser-react` and `browser-dom`. The allowed imports between packages are in `package-per-layer`.

## Inside `domain/src`

One folder per group from `hexagonal-layering`, one file per concept. `index.ts` is the only export and re-exports all of them.

```
domain/src/
  vo/          guess.ts, guess-failed.ts, guess-progress.ts, guess-status.ts, round.ts, score.ts, window-size.ts
  operations/  guess-progress.ts, guess-status.ts, round.ts, score.ts, window-size.ts   (+ a .test.ts next to each)
  ports/       guess-gateway.ts, rounds-repository.ts, window-size-repository.ts
  workflows/   fetch-guess.ts, record-round.ts, change-window-size.ts                    (+ a .test.ts next to each)
```

There is no `entities/` folder: no type has an identity. A concept can have a file in `vo/` (the type) and a file in `operations/` (the functions on it) with the same name. `vo/` and `operations/` import only `Data` from `effect`; `scripts/check-deps.mjs` checks it.

## Layers as Effect types

| Layer | Holds, in Effect terms | Example |
|---|---|---|
| `core` | `Bit`, `Bits`, `UseCaseCommand`, `UseCase` | `packages/core/src/usecase.ts` |
| `domain` | `vo/` plain types and `Data.TaggedError`; `operations/` pure functions; `workflows/` functions that take ports and return `Effect`; `ports/` interfaces whose methods return `Effect` | `Guess`, `clampWindowSize`, `fetchGuess`, `GuessGateway` |
| `application` | `Context.Service` state + its `Layer`, commands, `make...` use cases | `GuessState`, `makePressBit` |
| `adapter-*` | a port implementation, a plain `make...` function | `makeLongestMatchGateway`, `makeLocalStorageRoundsRepository` |
| `presentation/state` | UI-only state (`Layer`) and its use cases, shared by all toolkits | `WindowSizeDraftState`, `makeCommitWindowSizeDraft` |
| `presentation/browser-*` | the bridge (hook or `EventTarget`) and the screen | `useObserve`, `ObservedState` |
| `product-*` | the composition root | `main.tsx`, `main.ts` |

Game state (what the game needs to keep working) lives in `application`. Logic that only shapes one screen, such as the text in a field, the screen texts, the class of a history cell or which key presses a bit, lives in `presentation/state`, once, for all toolkits. Where a Layer is allowed: `when-to-use-layer`.

## File conventions

- Each package has one `src/index.ts`, its only export.
- Tests sit next to the code. In `domain`, a test sits next to the operation or workflow it tests (`operations/round.test.ts`). Other packages keep `src/*.test.ts`.
- A command and its maker share a file: `rounds/press-bit.ts` holds `PressBit` and `makePressBit`.
- Use cases of one state share a folder (`guess/`, `rounds/`, `score/` in application). The folder is the grouping; there is no grouping type.
- State service: `<Thing>State` in `state.ts` or `<thing>-state.ts`. Adapter: `make<Tech><Port>`.
- Application re-exports, as types, the domain types its use cases return, so browsers and products import `*-application` only.
- Names: `naming-without-false-hints`.

## Adding a feature: order

1. Domain: value objects and errors in `vo/`, rules as operations, ports, and a workflow where a rule and a port call go together. Test operations with literal inputs and workflows with fake ports.
2. Adapter and its test.
3. State service in application, if there is live state.
4. Commands and use cases, one file each (`effect-usecase-command`).
5. `index.ts` exports.
6. `presentation/state`, if a screen needs logic of its own.
7. Bridge entries in each `browser-*` package.
8. Product wiring (`effect-composition-root`) and a row in `scripts/check-deps.mjs` for each new package.

## Red flags

- Domain holds only ports and errors. See `hexagonal-layering`.
