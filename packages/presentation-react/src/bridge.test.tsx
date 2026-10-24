import { StrictMode } from "react"
import { act, cleanup, renderHook, waitFor } from "@testing-library/react"
import { Layer, ManagedRuntime } from "effect"
import { afterEach, describe, expect, it } from "vitest"
import { ObserveRounds, PressBit } from "@guess/interaction-application"
import type { Rounds } from "@guess/interaction-application"
import { GuessProvider } from "./bridge/provider.tsx"
import { useObserve } from "./bridge/use-observe.ts"
import { useRun } from "./bridge/use-run.ts"
import { makeFakes } from "./test-support.tsx"
import type { Fakes } from "./test-support.tsx"

afterEach(cleanup)

const wrapperFor = (fakes: Fakes, strict = false) => {
  const runtime = ManagedRuntime.make(Layer.empty)
  return ({ children }: { children: React.ReactNode }) => {
    const tree = <GuessProvider runner={runtime} useCases={fakes.useCases}>{children}</GuessProvider>
    return strict ? <StrictMode>{tree}</StrictMode> : tree
  }
}

const round = (n: number): Rounds => Array.from({ length: n }, () => ({ bit: 1 as const, guess: null, hit: null }))

describe("bridge", () => {
  it("useObserve gets the current value first, then changes", async () => {
    const fakes = makeFakes()
    fakes.rounds.push(round(1))
    const { result } = renderHook(() => useObserve(fakes.useCases.observeRounds, new ObserveRounds()), {
      wrapper: wrapperFor(fakes),
    })
    await waitFor(() => expect(result.current).toHaveLength(1))
    act(() => fakes.rounds.push(round(2)))
    await waitFor(() => expect(result.current).toHaveLength(2))
  })

  it("useRun runs the command", async () => {
    const fakes = makeFakes()
    const { result } = renderHook(() => useRun(fakes.useCases.pressBit), { wrapper: wrapperFor(fakes) })
    act(() => result.current(new PressBit({ bit: 1 })))
    await waitFor(() => expect(fakes.pressBit.calls).toHaveLength(1))
    expect(fakes.pressBit.calls[0]?.bit).toBe(1)
  })

  it("StrictMode and unmount leave no running subscriber", async () => {
    const fakes = makeFakes()
    const { result, unmount } = renderHook(() => useObserve(fakes.useCases.observeRounds, new ObserveRounds()), {
      wrapper: wrapperFor(fakes, true),
    })
    await waitFor(() => expect(result.current).toBeDefined())
    expect(fakes.subscribers.live).toBe(1)
    act(() => fakes.rounds.push(round(3)))
    await waitFor(() => expect(result.current).toHaveLength(3))
    unmount()
    await waitFor(() => expect(fakes.subscribers.live).toBe(0))
  })
})
