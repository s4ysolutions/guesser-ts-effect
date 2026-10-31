---
name: effect-composition-root
description: Use when writing or changing a product's main file that builds a ManagedRuntime and wires use cases, adding a use case to the wiring, deciding when to dispose the runtime, or tempted to write a wiring function that returns a record of use cases.
---

# Composition root: two phases

The product is the only place that knows concrete adapters. The DOM product is the same, except it ends with `mountGuessScreen(root, runtime, { ... })` instead of `<GuessProvider>`. Idea: vocabla-mill `composition-root` (language-neutral). `ManagedRuntime` and the phase split are Effect specific. Products hold no business logic.

## The real root (`packages/product-react/src/main.tsx`; `product-dom/src/main.ts` has the same phases)

```ts
// plain adapters
const repository = makeLocalStorageRoundsRepository()
const windowSizeRepository = makeLocalStorageWindowSizeRepository()

// phase 1: only the three Layers
const runtime = ManagedRuntime.make(
  Layer.mergeAll(
    GuessState.layer({ windowSizeRepository }),
    RoundsState.layer({ repository }),
    WindowSizeDraftState.layer(),
  ),
)
const { guessState, roundsState, draftState } = await runtime.runPromise(
  Effect.gen(function* () {
    return { guessState: yield* GuessState, roundsState: yield* RoundsState, draftState: yield* WindowSizeDraftState }
  }),
)

// phase 2: plain constructors, each called here, once
const takeGuess = makeTakeGuess({ guessState })
const requestGuess = makeRequestGuess({ guessState })
const pressBit = makePressBit({ roundsState, repository, takeGuess, requestGuess })
// ... resetRounds, resumeGame, observeRounds, observeScore, observeGuessStatus, observeWindowSize
const setWindowSize = makeSetWindowSize({ guessState, windowSizeRepository })
const observeWindowSizeDraft = makeObserveWindowSizeDraft({ draftState, observeWindowSize })
const editWindowSizeDraft = makeEditWindowSizeDraft({ draftState })
const commitWindowSizeDraft = makeCommitWindowSizeDraft({ draftState, setWindowSize })

// hand finished use cases and the runtime to the bridge
// (the use cases the screen needs; observeWindowSize and setWindowSize stay inside the draft use cases)
<GuessProvider
  runner={runtime}
  useCases={{
    observeRounds, observeScore, observeGuessStatus, observeWindowSizeDraft,
    pressBit, resetRounds, editWindowSizeDraft, commitWindowSizeDraft,
  }}
>

runtime.runFork(resumeGame(new ResumeGame()))      // first guess for loaded rounds
window.addEventListener("pagehide", (event) => { if (!event.persisted) void runtime.dispose() })
```

## Adding a feature (for example `notes`)

1. Make the plain adapter before phase 1 (`const notesRepository = make…()`).
2. Add `NotesState.layer({ repository: notesRepository })` to `Layer.mergeAll`, only if the `when-to-use-layer` table says yes.
3. Add `notesState: yield* NotesState` to the one `Effect.gen` that resolves tags.
4. Add one `const x = makeX({ ... })` line per use case.
5. Add the new use cases to the object given to the bridge. Order inside `mergeAll` does not matter; a Layer that needs a value gets it as an argument.
6. If the state needs a first action at start, call it after mount with `runtime.runFork(...)`, like `ResumeGame`.

## Rules

1. **The product calls every constructor itself.** No `wireGuesser()` returning a record: the reader must see each dependency. The line count is the cost; accept it. The use cases from `presentation/state` (`makeCommitWindowSizeDraft`) are built here too, from the same `setWindowSize` the product built.
2. **Phase 1 is effectful and scoped** (`when-to-use-layer`). Phase 2 is plain code: wrong argument = compile error.
3. **Resolve tags once** (the `Effect.gen` above) and pass `…State` values into constructors. Use cases never see a tag.
4. **The same runtime runs the bridge** (`runner={runtime}`); it fits `EffectRunner` structurally.
5. **Dispose on `pagehide`**: it releases scopes and interrupts the guess fiber. `pagehide` also fires when the page enters the back/forward cache, and a disposed app would be dead after "back". So dispose only when `!event.persisted`.
6. No error screen before mount: all three Layers have error type `never`; the only failure is a defect, which shows in the console.
7. Top-level `await` is fine in a Vite module product.

## Red flags

- A feature-level `makeXUseCases` helper.
- Business rules (clamping, ordering) in `main`.
- A fourth entry in `Layer.mergeAll` without a "yes" in the `when-to-use-layer` table.
