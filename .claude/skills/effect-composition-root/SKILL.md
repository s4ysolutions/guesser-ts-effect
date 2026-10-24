---
name: effect-composition-root
description: Use when writing or changing a product's main file that builds a ManagedRuntime and wires use cases, adding a use case to the wiring, deciding when to dispose the runtime, or tempted to write a wiring function that returns a record of use cases.
---

# Composition root: two phases

The product is the only place that knows concrete adapters. Idea: vocabla-mill `composition-root` (language-neutral). `ManagedRuntime` and the phase split are Effect specific. Products hold no business logic.

## The real root (`packages/product-react/src/main.tsx`, the DOM one is the same)

```ts
// plain adapter
const repository = makeLocalStorageRoundsRepository()

// phase 1: only the two Layers
const runtime = ManagedRuntime.make(
  Layer.mergeAll(GuessState.layer(), RoundsState.layer({ repository })),
)
const { guessState, roundsState } = await runtime.runPromise(
  Effect.gen(function* () {
    return { guessState: yield* GuessState, roundsState: yield* RoundsState }
  }),
)

// phase 2: plain constructors, each called here, once
const takeGuess = makeTakeGuess({ guessState })
const requestGuess = makeRequestGuess({ guessState })
const pressBit = makePressBit({ roundsState, repository, takeGuess, requestGuess })
// ... resetRounds, resumeGame, observeRounds, observeScore, observeGuessStatus,
//     observeWindowSize, setWindowSize

// hand finished use cases and the runtime to the bridge
<GuessProvider runner={runtime} useCases={{ observeRounds, pressBit, /* ... */ }}>

runtime.runFork(resumeGame(new ResumeGame()))      // first guess for loaded rounds
window.addEventListener("pagehide", () => { void runtime.dispose() })
```

## Adding a feature (for example `notes`)

1. Make the plain adapter before phase 1 (`const notesRepository = make…()`).
2. Add `NotesState.layer({ repository: notesRepository })` to `Layer.mergeAll`, only if the `when-to-use-layer` table says yes.
3. Add `notesState: yield* NotesState` to the one `Effect.gen` that resolves tags.
4. Add one `const x = makeX({ ... })` line per use case.
5. Add the new use cases to the object given to the bridge. Order inside `mergeAll` does not matter; a Layer that needs a value gets it as an argument.
6. If the state needs a first action at start, call it after mount with `runtime.runFork(...)`, like `ResumeGame`.

## Rules

1. **The product calls every constructor itself.** No `wireGuesser()` returning a record: the reader must see each dependency. The line count is the cost; accept it.
2. **Phase 1 is effectful and scoped** (`when-to-use-layer`). Phase 2 is plain code: wrong argument = compile error.
3. **Resolve tags once** (the `Effect.gen` above) and pass `…State` values into constructors. Use cases never see a tag.
4. **The same runtime runs the bridge** (`runner={runtime}`); it fits `EffectRunner` structurally.
5. **Dispose on `pagehide`**: it releases scopes and interrupts the guess fiber. `pagehide` also fires when the page enters the back/forward cache and the app would then be dead after "back". The products still dispose unconditionally (known gap); in new code dispose only when `!event.persisted`.
6. No error screen before mount: both Layers have error type `never`; the only failure is a defect, which shows in the console.
7. Top-level `await` is fine in a Vite module product.

## Red flags

- A feature-level `makeXUseCases` helper.
- Business rules (clamping, ordering) in `main`.
- A third entry in `Layer.mergeAll` without a "yes" in the `when-to-use-layer` table.
