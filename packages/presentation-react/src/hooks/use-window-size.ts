import { useCallback } from "react"
import { ObserveWindowSize, SetWindowSize } from "@guess/guesser-application"
import { useUseCases } from "../bridge/provider.tsx"
import { useObserve } from "../bridge/use-observe.ts"
import { useRun } from "../bridge/use-run.ts"

const observeWindowSize = new ObserveWindowSize()

export const useWindowSize = (): readonly [number | undefined, (n: number) => void] => {
  const useCases = useUseCases()
  const size = useObserve(useCases.observeWindowSize, observeWindowSize)
  const run = useRun(useCases.setWindowSize)
  const set = useCallback((n: number) => run(new SetWindowSize({ n })), [run])
  return [size, set] as const
}
