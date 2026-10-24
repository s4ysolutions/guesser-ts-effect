import { createContext, useContext, useMemo } from "react"
import type { ReactNode } from "react"
import type { UseCase } from "@guess/core"
import type {
  ObserveGuessStatus,
  ObserveWindowSize,
  SetWindowSize,
} from "@guess/guesser-application"
import type { ObserveRounds, ObserveScore, PressBit, ResetRounds } from "@guess/interaction-application"
import type { EffectRunner } from "./runner.ts"

/** The use cases the React bridge needs. The product builds them and passes them in. */
export interface GuessUseCases {
  readonly observeRounds: UseCase<ObserveRounds>
  readonly observeScore: UseCase<ObserveScore>
  readonly observeGuessStatus: UseCase<ObserveGuessStatus>
  readonly observeWindowSize: UseCase<ObserveWindowSize>
  readonly pressBit: UseCase<PressBit>
  readonly resetRounds: UseCase<ResetRounds>
  readonly setWindowSize: UseCase<SetWindowSize>
}

interface Bridge {
  readonly runner: EffectRunner
  readonly useCases: GuessUseCases
}

const BridgeContext = createContext<Bridge | null>(null)

export const GuessProvider = (props: {
  readonly runner: EffectRunner
  readonly useCases: GuessUseCases
  readonly children?: ReactNode
}) => {
  const { runner, useCases, children } = props
  const bridge = useMemo(() => ({ runner, useCases }), [runner, useCases])
  return <BridgeContext.Provider value={bridge}>{children}</BridgeContext.Provider>
}

export const useBridge = (): Bridge => {
  const bridge = useContext(BridgeContext)
  if (bridge === null) throw new Error("GuessProvider is missing above this component")
  return bridge
}

export const useUseCases = (): GuessUseCases => useBridge().useCases
