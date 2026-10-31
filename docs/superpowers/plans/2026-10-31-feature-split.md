# Feature split refactor

**Goal:** one feature, `guesser`, split into `logic` (hexagonal layers) and `presentation` (`state`, `browser-*`), with every domain rule in the domain package.

**Authority:** `.claude/skills/hexagonal-layering/SKILL.md` for what goes where. `docs/superpowers/specs/2026-10-23-guess-design.md` for product behaviour. Behaviour on screen does not change.

## Global constraints

- Effect 4.0.6. Patterns as in the existing code: `Command` + `UseCase<C>`, plain adapters, Layers only for `GuessState`, `RoundsState` and the new draft state.
- Do not run `git commit`. Use `git mv` for moves.
- Do not touch anything outside this repository.
- Do not add dependencies other than workspace packages.
- Each step ends with `pnpm verify` passing, run from the repo root. Test count must not fall, unless a test moved or was merged.
- Comments follow the density and style of the surrounding code.

## Target layout

```
packages/
  core/                                 @guess/core
  features/guesser/
    logic/
      domain/                           @guess/guesser-domain
      application/                      @guess/guesser-application
      adapter-longest-match/            @guess/guesser-adapter-longest-match
      adapter-jev/                      @guess/guesser-adapter-jev
      adapter-local-storage/            @guess/guesser-adapter-local-storage
    presentation/
      state/                            @guess/guesser-state
      browser-react/                    @guess/guesser-browser-react
      browser-dom/                      @guess/guesser-browser-dom
  product-react/                        @guess/product-react
  product-dom/                          @guess/product-dom
```

`packages/**` in `pnpm-workspace.yaml` already matches this, so the glob stays.

Allowed dependencies:

```
guesser-domain              -> core, effect
guesser-adapter-*           -> guesser-domain, core, effect
guesser-application         -> guesser-domain, guesser-adapter-longest-match, core, effect
guesser-state               -> guesser-application, core, effect
guesser-browser-react       -> guesser-state, guesser-application, core, effect, react, react-dom
guesser-browser-dom         -> guesser-state, guesser-application, core, effect
product-react               -> guesser-browser-react, guesser-state, guesser-application,
                               guesser-adapter-local-storage, core, effect, react, react-dom
product-dom                 -> guesser-browser-dom, guesser-state, guesser-application,
                               guesser-adapter-local-storage, core, effect
```

## Wiring demo stays

- Gateway: self-contained. `gateway?` is optional and application creates longest-match by default.
- Repositories: open. The product injects them.

## Step A: move packages, no code logic change (Haiku)

- `packages/guesser/domain` -> `packages/features/guesser/logic/domain`
- `packages/guesser/application` -> `.../logic/application`
- `packages/guesser/adapter-longest-match` -> `.../logic/adapter-longest-match`
- `packages/guesser/adapter-jev` -> `.../logic/adapter-jev`
- `packages/interaction/adapter-local-storage` -> `.../logic/adapter-local-storage`, renamed `@guess/guesser-adapter-local-storage`
- `packages/interaction/domain` -> `.../logic/interaction-domain` (temporary, name unchanged)
- `packages/interaction/application` -> `.../logic/interaction-application` (temporary, name unchanged)
- `packages/presentation-react` -> `.../presentation/browser-react`, renamed `@guess/guesser-browser-react`
- `packages/presentation-dom` -> `.../presentation/browser-dom`, renamed `@guess/guesser-browser-dom`

Update imports, `package.json` dependencies, relative paths in each `tsconfig.json` and config file, and the table in `scripts/check-deps.mjs` (keep the two temporary interaction entries). Run `pnpm install`, then `pnpm verify`.

## Step B: merge interaction into logic (Sonnet)

- Move `interaction-domain` sources into `guesser-domain`. Delete the package.
- Move `interaction-application` sources into `guesser-application`. Delete the package.
- Application folders: `guess/` (state, request, take, status, window), `rounds/` (state, press-bit, reset-rounds, observe-rounds, resume), `score/`.
- `index.ts` of application exports everything the products and browsers need, including `Round`, `Rounds`, `RoundsRepository`, `Score` as types.
- Update browsers, products, adapter-local-storage, `check-deps.mjs` to the Allowed dependencies above (without `guesser-state`, added in step D).

## Step C: rules to domain, storage behind a port (Sonnet)

Domain gets, as pure functions and plain types (exact helper names are the implementer's choice, following existing naming):

- `window-size.ts`: `WINDOW_SIZE_DEFAULT`, `WINDOW_SIZE_MIN`, `WINDOW_SIZE_MAX`, `clampWindowSize`, `isWindowSize`, and the `WindowSizeRepository` port (`load: Effect<number>`, `save: (n) => Effect<void>`).
- `guess-status.ts`: the internal status union, renamed `GuessProgress`, and public `GuessStatus`. Functions:
  - the progress for a new request: no bits gives Idle, otherwise Thinking;
  - progress after success and after failure;
  - taking the guess: returns the guess and the next progress, or null and unchanged progress;
  - `publicStatus(progress)`, which drops the guess so a UI cannot see the bit before the press.
- `round.ts`: add a pure function that appends a new round to `Rounds`.
- The NaN rule of `SetWindowSize` moves into a domain function if that is simpler than the guard.

Application then:

- `GuessState` no longer has `storage`, `loadWindowSize`, `saveWindowSize` or `defaultStorage`. `GuessState.layer({ windowSizeRepository })` is required and loads the size.
- `makeSetWindowSize` gets `windowSizeRepository` as a dependency and saves through it.
- Use cases read state, call domain functions, write state and call ports. Locks, `FiberHandle` and the "clear before Thinking" order stay in application.
- `application/index.ts` re-exports `WINDOW_SIZE_MIN` and `WINDOW_SIZE_MAX`, so browsers need no domain import.

`adapter-local-storage` gets `makeLocalStorageWindowSizeRepository(storage?)`: same key `guess.windowSize`, same "no storage or invalid value gives the default", same "ignore a failed write", same lazy access to `localStorage`. It validates with `isWindowSize`. Move the storage tests here. Both products pass it to the layer.

## Step D: presentation/state (Sonnet)

New package `@guess/guesser-state`, one package, with these files in `src/`:

- `history.ts`: `HISTORY_LENGTH = 40`, `recentRounds(rounds)`. Pure.
- `window-size-draft.ts`: pure parsing: text that is empty or not a number gives null.
- `window-size-draft-state.ts`: `WindowSizeDraftState` service with a `Layer`, holding `SubscriptionRef<string | null>`. null means no edit is in progress.
- Use cases, in the `Command` + `UseCase<C>` form:
  - `ObserveWindowSizeDraft`: `Stream<string>`. The draft if not null, otherwise the current size as text. Built from the draft ref and `observeWindowSize`.
  - `EditWindowSizeDraft({ text })`: sets the draft.
  - `CommitWindowSizeDraft`: parses the draft; a number goes to `setWindowSize` as typed; the draft becomes null in every case.

Browsers:

- Both use `recentRounds` and drop their own `HISTORY_LENGTH`.
- `WindowSizeInput` and `windowSizeField` keep only events and rendering. No `useState` draft, no `Number(...)` parsing.
- The DOM bridge gets a draft observed-state class; the React bridge gets a hook.
- Keep: Enter blurs, blur commits, `min`/`max` on the input.

Products: add the layer, build the three use cases, pass them to the browsers. Update `check-deps.mjs`.

Move draft behaviour tests to `state`; keep one screen test per browser for blur and Enter.

## Step E: TS skills (Sonnet)

Update every skill in `.claude/skills/` that names old paths, packages or rules, so that each describes the final code. `effect-feature-layout` becomes short: it refers to `hexagonal-layering` for the rules and keeps only how layers map to packages and Effect types.

## Step F: final check (Sonnet review)

Review all changes against `hexagonal-layering`. Run `pnpm verify`. Check both products in the browser.
