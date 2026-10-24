import { Effect, Layer, ManagedRuntime } from "effect"
import { makeLocalStorageRoundsRepository } from "@guess/interaction-adapter-local-storage"
import {
  GuessState,
  makeObserveGuessStatus,
  makeObserveWindowSize,
  makeRequestGuess,
  makeSetWindowSize,
  makeTakeGuess,
} from "@guess/guesser-application"
import {
  makeObserveRounds,
  makeObserveScore,
  makePressBit,
  makeResetRounds,
  makeResumeGame,
  ResumeGame,
  RoundsState,
} from "@guess/interaction-application"
import { mountGuessScreen } from "@guess/presentation-dom"

const repository = makeLocalStorageRoundsRepository()

const runtime = ManagedRuntime.make(
  Layer.mergeAll(GuessState.layer(), RoundsState.layer({ repository })),
)

const { guessState, roundsState } = await runtime.runPromise(
  Effect.gen(function* () {
    return { guessState: yield* GuessState, roundsState: yield* RoundsState }
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
const setWindowSize = makeSetWindowSize({ guessState })

const root = document.getElementById("app")
if (root === null) throw new Error("Missing #app element")

mountGuessScreen(root, runtime, {
  observeRounds,
  observeScore,
  observeGuessStatus,
  observeWindowSize,
  pressBit,
  resetRounds,
  setWindowSize,
})

runtime.runFork(resumeGame(new ResumeGame()))

window.addEventListener("pagehide", () => {
  void runtime.dispose()
})
