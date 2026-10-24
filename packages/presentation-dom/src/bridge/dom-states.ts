import type { UseCase } from "@guess/core"
import type { Bit } from "@guess/core"
import { ObserveGuessStatus, ObserveWindowSize, SetWindowSize } from "@guess/guesser-application"
import type { GuessStatus } from "@guess/guesser-application"
import { ObserveRounds, ObserveScore, PressBit, ResetRounds } from "@guess/interaction-application"
import type { Rounds, Score } from "@guess/interaction-application"
import { ObservedState } from "./observed-state.ts"
import type { EffectRunner } from "./runner.ts"

/** The use cases the DOM bridge needs. The product builds them and passes them in. */
export interface GuessUseCases {
  readonly observeRounds: UseCase<ObserveRounds>
  readonly observeScore: UseCase<ObserveScore>
  readonly observeGuessStatus: UseCase<ObserveGuessStatus>
  readonly observeWindowSize: UseCase<ObserveWindowSize>
  readonly pressBit: UseCase<PressBit>
  readonly resetRounds: UseCase<ResetRounds>
  readonly setWindowSize: UseCase<SetWindowSize>
}

/** Rounds, plus the commands that change them. */
export class DomRounds extends ObservedState<Rounds> {
  readonly #runner: EffectRunner
  readonly #useCases: Pick<GuessUseCases, "pressBit" | "resetRounds">

  constructor(runner: EffectRunner, useCases: Pick<GuessUseCases, "observeRounds" | "pressBit" | "resetRounds">) {
    super(runner, useCases.observeRounds(new ObserveRounds()))
    this.#runner = runner
    this.#useCases = useCases
  }

  press(bit: Bit): void {
    this.#runner.runFork(this.#useCases.pressBit(new PressBit({ bit })))
  }

  reset(): void {
    this.#runner.runFork(this.#useCases.resetRounds(new ResetRounds()))
  }
}

export class DomScore extends ObservedState<Score> {
  constructor(runner: EffectRunner, useCases: Pick<GuessUseCases, "observeScore">) {
    super(runner, useCases.observeScore(new ObserveScore()))
  }
}

export class DomGuessStatus extends ObservedState<GuessStatus> {
  constructor(runner: EffectRunner, useCases: Pick<GuessUseCases, "observeGuessStatus">) {
    super(runner, useCases.observeGuessStatus(new ObserveGuessStatus()))
  }
}

/** The window size N, plus the command that changes it. */
export class DomWindowSize extends ObservedState<number> {
  readonly #runner: EffectRunner
  readonly #useCases: Pick<GuessUseCases, "setWindowSize">

  constructor(runner: EffectRunner, useCases: Pick<GuessUseCases, "observeWindowSize" | "setWindowSize">) {
    super(runner, useCases.observeWindowSize(new ObserveWindowSize()))
    this.#runner = runner
    this.#useCases = useCases
  }

  set(n: number): void {
    this.#runner.runFork(this.#useCases.setWindowSize(new SetWindowSize({ n })))
  }
}
