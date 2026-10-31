import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { Effect, Layer, ManagedRuntime } from "effect"
import { makeLocalStorageRoundsRepository, makeLocalStorageWindowSizeRepository } from "@guess/guesser-adapter-local-storage"
import {
  GuessState,
  makeObserveGuessStatus,
  makeObserveWindowSize,
  makeRequestGuess,
  makeSetWindowSize,
  makeTakeGuess,
  makeObserveRounds,
  makeObserveScore,
  makePressBit,
  makeResetRounds,
  makeResumeGame,
  ResumeGame,
  RoundsState,
} from "@guess/guesser-application"
import {
  makeCommitWindowSizeDraft,
  makeEditWindowSizeDraft,
  makeObserveWindowSizeDraft,
  WindowSizeDraftState,
} from "@guess/guesser-state"
import { GuessProvider, GuessScreen } from "@guess/guesser-browser-react"

const repository = makeLocalStorageRoundsRepository()
const windowSizeRepository = makeLocalStorageWindowSizeRepository()

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

const takeGuess = makeTakeGuess({ guessState })
const requestGuess = makeRequestGuess({ guessState })
const pressBit = makePressBit({ roundsState, repository, takeGuess, requestGuess })
const resetRounds = makeResetRounds({ roundsState, repository, requestGuess })
const resumeGame = makeResumeGame({ roundsState, requestGuess })
const observeRounds = makeObserveRounds({ roundsState })
const observeScore = makeObserveScore({ roundsState })
const observeGuessStatus = makeObserveGuessStatus({ guessState })
const observeWindowSize = makeObserveWindowSize({ guessState })
const setWindowSize = makeSetWindowSize({ guessState, windowSizeRepository })
const observeWindowSizeDraft = makeObserveWindowSizeDraft({ draftState, observeWindowSize })
const editWindowSizeDraft = makeEditWindowSizeDraft({ draftState })
const commitWindowSizeDraft = makeCommitWindowSizeDraft({ draftState, setWindowSize })

const root = document.getElementById("app")
if (root === null) throw new Error("Missing #app element")

createRoot(root).render(
  <StrictMode>
    <GuessProvider
      runner={runtime}
      useCases={{
        observeRounds,
        observeScore,
        observeGuessStatus,
        observeWindowSizeDraft,
        pressBit,
        resetRounds,
        editWindowSizeDraft,
        commitWindowSizeDraft,
      }}
    >
      <GuessScreen />
    </GuessProvider>
  </StrictMode>,
)

runtime.runFork(resumeGame(new ResumeGame()))

window.addEventListener("pagehide", (event) => {
  if (!event.persisted) void runtime.dispose()
})
