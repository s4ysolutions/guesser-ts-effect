import { Effect } from "effect"
import { expect, test } from "vitest"
import type { Bits } from "@guess/core"
import type { GuessGateway } from "../ports/guess-gateway.ts"
import { Timeout } from "../vo/guess-failed.ts"
import { fetchGuess } from "./fetch-guess.ts"

test("asks the gateway for the last n bits and returns Ready", async () => {
  const calls: Array<Bits> = []
  const gateway: GuessGateway = {
    guess: (bits) => Effect.sync(() => (calls.push(bits), { bit: 1 })),
  }
  const progress = await Effect.runPromise(fetchGuess(gateway, [0, 1, 1, 0], 2))
  expect(calls).toEqual([[1, 0]])
  expect(progress).toEqual({ _tag: "Ready", guess: { bit: 1 } })
})

test("a gateway failure becomes Failed progress", async () => {
  const error = new Timeout()
  const gateway: GuessGateway = { guess: () => Effect.fail(error) }
  const progress = await Effect.runPromise(fetchGuess(gateway, [1], 5))
  expect(progress).toEqual({ _tag: "Failed", error })
})
