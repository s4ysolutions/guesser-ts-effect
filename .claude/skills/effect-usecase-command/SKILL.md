---
name: effect-usecase-command
description: Use when adding or changing a use case in a TypeScript + Effect application layer, writing a command class, a make-function that returns UseCase<C>, an Observe stream, or when ResponseOf infers unknown, a use case needs R or an error in its type, or fast UI clicks lose updates.
---

# Use cases: Command + `UseCase<C>` in TypeScript + Effect

A **command** is plain data that carries its response type. A **use case** handles exactly one command type. Presentation depends only on `UseCase<C>`. Idea comes from vocabla-mill `usecase-command` and `create-usecase` (language-neutral). The phantom field, `Semaphore` and `Stream` parts are TS/Effect-specific.

## The core types (`packages/core/src/usecase.ts`)

```ts
export interface UseCaseCommand<Response> {
  readonly "~response"?: Response
}
export type ResponseOf<C> = C extends UseCaseCommand<infer R> ? R : never
export interface UseCase<C extends UseCaseCommand<unknown>> {
  (command: C): ResponseOf<C>
}
```

TS has no path-dependent types, so the response rides on an optional phantom field.

## One file per command (`packages/interaction/application/src/rounds/press-bit.ts`)

```ts
export class PressBit extends Data.TaggedClass("PressBit")<{ readonly bit: Bit }> {
  declare readonly "~response"?: Effect.Effect<void>
}

export const makePressBit = (deps: {
  readonly roundsState: RoundsState["Service"]
  readonly repository: RoundsRepository
  readonly takeGuess: UseCase<TakeGuess>
  readonly requestGuess: UseCase<RequestGuess>
}): UseCase<PressBit> => {
  const { roundsState, repository, takeGuess, requestGuess } = deps
  return (command) =>
    roundsState.lock.withPermits(1)(Effect.gen(function*() {
      const guess = yield* takeGuess(new TakeGuess())
      const current = yield* SubscriptionRef.get(roundsState.rounds)
      const next = [...current, makeRound(command.bit, guess?.bit ?? null)]
      yield* SubscriptionRef.set(roundsState.rounds, next)
      yield* repository.save(next)
      yield* requestGuess(new RequestGuess({ bits: bitsOf(next) }))
    }))
}
```

## Rules (each one was a real mistake)

1. **Declare the phantom field in the class body**: `declare readonly "~response"?: X`. Writing only `implements UseCaseCommand<X>` is not enough: `ResponseOf` then infers `unknown`, because TS reads the class members, not the `implements` clause. A type test (`expectTypeOf`) catches it.
2. **Constructor deps use `X["Service"]`**, not `X`. In Effect 4 the class type is the tag key, not the service value. `roundsState: RoundsState` does not compile against the value you get from the runtime.
3. **A plain function, not an Effect, not a Layer.** `makeX(deps): UseCase<X>` is called once by the composition root. No tag, no `Layer`, no `makeX` that returns `Effect`.
4. **Every dependency is a constructor argument.** No hidden lookup (a WeakMap keyed by the state was tried and rejected). A test can then see all deps in the signature. Other features' use cases come in as `UseCase<TheirCommand>`.
5. **`R = never` and error `never`.** Never put `RoundsState` in `R`. Failures become state that an `ObserveX` shows (`Failed` status), not an error the UI must catch. Bad input is either ignored (a no-op, like `Number.isNaN` in `SetWindowSize`) or clamped. If the UI must show the problem, add a field to the state; do not add `E`.
6. **Observe returns `Stream`, command returns `Effect`.** `SubscriptionRef.changes` emits the current value first, then each change. Name them `ObserveX`.
7. **The logic owns validation and clamping.** `SetWindowSize` clamps and rounds `n`; the UI sends what the user typed.
8. **Concurrent commands need a lock.** UI bridges start each command as its own fiber. A command that reads then writes state, or issues requests in order, must run under a 1-permit `Semaphore` that the **state service owns** (`roundsState.lock`, `guessState.lock`), made in the state's Layer. `SubscriptionRef.updateEffect` is not enough when the body also calls other use cases.
9. **No re-entrant locking.** `Semaphore` is not re-entrant. If two commands share a step, extract an unlocked internal function (`startGuess`, not exported from `index.ts`) and call it while holding the permit.
10. **Stale async result:** before setting `Thinking`, call `FiberHandle.clear(state.fiber)`. It waits for the old fiber to exit, so the old guess cannot write after the new state.
11. Do not use `Request.TaggedClass` (made for batching; its response is a value, not a `Stream`).

## Honest limits

A state service's shape is hidden **by convention only**: `GuessState["Service"]` is a structural type, so any code could read the ref. The rule "only this package's use cases touch it" is kept by review, not by the compiler.

## Red flags

- `implements` without `declare` - stop, add the field.
- `R` is not `never` - move the service into a constructor arg.
- A command that does read-modify-write with no lock.
- A `Layer` or tag for a use case.
