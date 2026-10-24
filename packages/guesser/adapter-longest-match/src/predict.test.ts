import { test, expect } from "vitest"
import { Effect } from "effect"
import { predictNext } from "./predict.ts"
import { makeLongestMatchGateway } from "./gateway.ts"

test("alternating", () => expect(predictNext([0, 1, 0, 1, 0, 1, 0])).toEqual({ bit: 1, confidence: 5 / 6 }))
test("repeated block", () => expect(predictNext([0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1])).toEqual({ bit: 1, confidence: 7 / 10 }))
test("most recent match wins", () => expect(predictNext([1, 0, 1, 1])).toEqual({ bit: 1, confidence: 1 / 3 }))
test("no match: majority bit", () => {
  const result = predictNext([1])
  expect(result).toEqual({ bit: 1 })
  expect("confidence" in result).toBe(false)
})
test("no match, tie: opposite of last", () => {
  const first = predictNext([0, 1])
  expect(first).toEqual({ bit: 0 })
  expect("confidence" in first).toBe(false)
  const second = predictNext([1, 0])
  expect(second).toEqual({ bit: 1 })
  expect("confidence" in second).toBe(false)
})
test("empty input", () => expect(predictNext([])).toEqual({ bit: 0 }))
test("gateway never fails", async () => {
  expect(await Effect.runPromise(makeLongestMatchGateway().guess([0, 1, 0]))).toEqual(predictNext([0, 1, 0]))
})
