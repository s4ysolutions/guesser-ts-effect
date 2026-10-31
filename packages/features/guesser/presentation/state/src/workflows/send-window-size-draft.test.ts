import { Effect } from "effect"
import { expect, test } from "vitest"
import { sendWindowSizeDraft } from "./send-window-size-draft.ts"

const send = (draft: string | null) => {
  const sent: Array<number> = []
  Effect.runSync(sendWindowSizeDraft((n) => Effect.sync(() => void sent.push(n)), draft))
  return sent
}

test("the typed number is sent as typed, out of range included", () => {
  expect(send("300")).toEqual([300])
})

test("text that is not a number is sent as NaN", () => {
  const sent = send("abc")
  expect(sent).toHaveLength(1)
  expect(sent[0]).toBeNaN()
})

test("no draft or an empty draft sends nothing", () => {
  expect(send(null)).toEqual([])
  expect(send("")).toEqual([])
})
