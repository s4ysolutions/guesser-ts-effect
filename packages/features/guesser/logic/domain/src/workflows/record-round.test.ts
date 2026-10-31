import { Effect } from "effect"
import { expect, test } from "vitest"
import type { RoundsRepository } from "../ports/rounds-repository.ts"
import type { Rounds } from "../vo/round.ts"
import { makeRound } from "../operations/round.ts"
import { recordRound } from "./record-round.ts"

const makeFakeRepository = () => {
  const saves: Array<Rounds> = []
  const repository: RoundsRepository = {
    load: Effect.succeed([]),
    save: (rounds) => Effect.sync(() => void saves.push(rounds)),
  }
  return { repository, saves }
}

test("appends the round with the ready guess, saves it and returns it", async () => {
  const { repository, saves } = makeFakeRepository()
  const before = [makeRound(1, null)]
  const next = await Effect.runPromise(recordRound(repository, before, 0, { bit: 1 }))
  expect(next).toEqual([makeRound(1, null), makeRound(0, 1)])
  expect(saves).toEqual([next])
})

test("no ready guess saves a round without a guess", async () => {
  const { repository, saves } = makeFakeRepository()
  const next = await Effect.runPromise(recordRound(repository, [], 1, null))
  expect(next).toEqual([makeRound(1, null)])
  expect(saves).toEqual([next])
})
