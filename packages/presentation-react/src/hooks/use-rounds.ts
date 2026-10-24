import { useMemo } from "react"
import type { Bit } from "@guess/core"
import { ObserveRounds, PressBit, ResetRounds } from "@guess/interaction-application"
import type { Rounds } from "@guess/interaction-application"
import { useUseCases } from "../bridge/provider.tsx"
import { useObserve } from "../bridge/use-observe.ts"
import { useRun } from "../bridge/use-run.ts"

const observeRounds = new ObserveRounds()

export const useRounds = (): readonly [
  Rounds | undefined,
  { readonly press: (bit: Bit) => void; readonly reset: () => void },
] => {
  const useCases = useUseCases()
  const rounds = useObserve(useCases.observeRounds, observeRounds)
  const runPress = useRun(useCases.pressBit)
  const runReset = useRun(useCases.resetRounds)
  const actions = useMemo(
    () => ({
      press: (bit: Bit) => runPress(new PressBit({ bit })),
      reset: () => runReset(new ResetRounds()),
    }),
    [runPress, runReset],
  )
  return [rounds, actions] as const
}
