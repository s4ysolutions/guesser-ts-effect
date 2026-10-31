import { ObserveScore } from "@guess/guesser-application"
import type { Score } from "@guess/guesser-application"
import { useUseCases } from "../bridge/provider.tsx"
import { useObserve } from "../bridge/use-observe.ts"

const observeScore = new ObserveScore()

export const useScore = (): Score | undefined => useObserve(useUseCases().observeScore, observeScore)
