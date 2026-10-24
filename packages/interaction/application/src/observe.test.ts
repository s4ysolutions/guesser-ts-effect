import { Effect, Fiber, Stream, SubscriptionRef } from "effect"
import { expect, test } from "vitest"
import { makeRound, scoreOf } from "@guess/interaction-domain"
import type { Rounds } from "@guess/interaction-domain"
import { makeObserveRounds, makeObserveScore, ObserveRounds, ObserveScore, RoundsState } from "./index.ts"
import { makeMemoryRoundsRepository } from "./test-support.ts"

const run = <A>(effect: Effect.Effect<A, never, RoundsState>, rounds: Rounds = []) =>
  Effect.runPromise(
    effect.pipe(
      Effect.scoped,
      Effect.provide(RoundsState.layer({ repository: makeMemoryRoundsRepository(rounds) })),
    ),
  )

const first = <A>(stream: Stream.Stream<A>) =>
  Stream.runHead(stream).pipe(Effect.map((o) => (o._tag === "Some" ? o.value : undefined)))

const settle = Effect.sleep("5 millis")

const saved: Rounds = [makeRound(1, 1), makeRound(0, null)]
const next: Rounds = [makeRound(1, 1), makeRound(0, 1), makeRound(1, null)]

test("layer loads saved rounds", () =>
  run(Effect.gen(function*() {
    const roundsState = yield* RoundsState
    const observe = makeObserveRounds({ roundsState })
    expect(yield* first(observe(new ObserveRounds()))).toEqual(saved)
  }), saved))

test("ObserveScore follows rounds", () =>
  run(Effect.gen(function*() {
    const roundsState = yield* RoundsState
    const observe = makeObserveScore({ roundsState })
    const fiber = yield* Effect.forkChild(
      Stream.runCollect(Stream.take(observe(new ObserveScore()), 2)),
    )
    yield* settle
    yield* SubscriptionRef.set(roundsState.rounds, next)
    const seen = Array.from(yield* Fiber.join(fiber))
    expect(seen).toEqual([scoreOf(saved), scoreOf(next)])
  }), saved))
