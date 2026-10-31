import type { UseCase } from "@guess/core"
import type { Bit } from "@guess/core"
import { ObserveGuessStatus, ObserveRounds, ObserveScore, PressBit, ResetRounds } from "@guess/guesser-application"
import type { GuessStatus, Rounds, Score } from "@guess/guesser-application"
import { CommitWindowSizeDraft, EditWindowSizeDraft, ObserveWindowSizeDraft } from "@guess/guesser-state"
import { ObservedState } from "./observed-state.ts"
import type { EffectRunner } from "./runner.ts"

/** The use cases the DOM bridge needs. The product builds them and passes them in. */
export interface GuessUseCases {
  readonly observeRounds: UseCase<ObserveRounds>
  readonly observeScore: UseCase<ObserveScore>
  readonly observeGuessStatus: UseCase<ObserveGuessStatus>
  readonly observeWindowSizeDraft: UseCase<ObserveWindowSizeDraft>
  readonly pressBit: UseCase<PressBit>
  readonly resetRounds: UseCase<ResetRounds>
  readonly editWindowSizeDraft: UseCase<EditWindowSizeDraft>
  readonly commitWindowSizeDraft: UseCase<CommitWindowSizeDraft>
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

/** The text of the size field, plus the commands that edit and commit it. */
export class DomWindowSizeDraft extends ObservedState<string> {
  readonly #runner: EffectRunner
  readonly #useCases: Pick<GuessUseCases, "editWindowSizeDraft" | "commitWindowSizeDraft">

  constructor(
    runner: EffectRunner,
    useCases: Pick<GuessUseCases, "observeWindowSizeDraft" | "editWindowSizeDraft" | "commitWindowSizeDraft">,
  ) {
    super(runner, useCases.observeWindowSizeDraft(new ObserveWindowSizeDraft()))
    this.#runner = runner
    this.#useCases = useCases
  }

  edit(text: string): void {
    this.#runner.runFork(this.#useCases.editWindowSizeDraft(new EditWindowSizeDraft({ text })))
  }

  commit(): void {
    this.#runner.runFork(this.#useCases.commitWindowSizeDraft(new CommitWindowSizeDraft()))
  }
}
