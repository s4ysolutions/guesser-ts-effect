import { ObserveScore } from "@guess/interaction-application"
import type { Score } from "@guess/interaction-application"
import { useUseCases } from "../bridge/provider.tsx"
import { useObserve } from "../bridge/use-observe.ts"

const observeScore = new ObserveScore()

export const useScore = (): Score | undefined => useObserve(useUseCases().observeScore, observeScore)
