import { useCallback } from "react"
import type { Effect } from "effect"
import type { UseCase, UseCaseCommand } from "@guess/core"
import { useBridge } from "./provider.tsx"

/** Returns a function that runs a command and does not wait for it. */
export const useRun = <C extends UseCaseCommand<Effect.Effect<unknown, never, never>>>(
  useCase: UseCase<C>,
): ((command: C) => void) => {
  const { runner } = useBridge()
  return useCallback((command: C) => {
    runner.runFork(useCase(command))
  }, [runner, useCase])
}
