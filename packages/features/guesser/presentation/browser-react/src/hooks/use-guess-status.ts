import { ObserveGuessStatus } from "@guess/guesser-application"
import type { GuessStatus } from "@guess/guesser-application"
import { useUseCases } from "../bridge/provider.tsx"
import { useObserve } from "../bridge/use-observe.ts"

const observeGuessStatus = new ObserveGuessStatus()

export const useGuessStatus = (): GuessStatus | undefined =>
  useObserve(useUseCases().observeGuessStatus, observeGuessStatus)
