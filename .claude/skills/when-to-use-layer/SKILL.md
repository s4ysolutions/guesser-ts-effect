---
name: when-to-use-layer
description: Use when deciding whether a service, adapter, port or use case in Effect gets a Context.Service tag and a Layer, when someone says "make it a Layer, that is idiomatic Effect", or when R types are spreading through use cases.
---

# When a Layer earns its place

A `Layer` is a constructor with memoization and a **scope**. Use one only when the service has (a) **effectful creation** or (b) **owns a resource that must be released**. Otherwise write a plain function and pass the value. The rule is language-neutral (vocabla-mill `zio-layer-composition` and `composition-root` say the same for ZIO); `Layer.effect` and `Context.Service` are Effect 4.0.6 specifics.

This goes against the common Effect habit "a Layer for everything". The code is on purpose. It does not mean the authors missed Layers.

## The table for this repo

| Thing | Effectful creation | Owns resource | Layer |
|---|---|---|---|
| use cases (about 10) | no | no | no |
| `makeLocalStorageRoundsRepository`, `makeLongestMatchGateway`, Jev gateway | no | no | no |
| `RoundsState` | yes: `SubscriptionRef.make`, first `load` | no | **yes** |
| `GuessState` | yes: `SubscriptionRef.make` | yes: guess fiber, interrupted on dispose | **yes** |

Exactly two Layers: `GuessState.layer(options?)` and `RoundsState.layer({ repository })`. (`packages/guesser/application/src/state.ts`, `packages/interaction/application/src/state.ts`)

```ts
static layer(deps: { readonly repository: RoundsRepository }): Layer.Layer<RoundsState> {
  return Layer.effect(RoundsState, Effect.gen(function*() {
    const rounds = yield* SubscriptionRef.make(yield* deps.repository.load)
    const lock = yield* Semaphore.make(1)
    return { rounds, lock }
  }))
}
```

## Consequences

- **Ports are plain TS interfaces**, not tags. A Layer that needs a plain dependency takes it as a function argument (`RoundsState.layer({ repository })`), not through `R`.
- Use cases have `R = never`. Dependencies are constructor arguments, so the type of a use case never shows them.
- Adapters resolve browser globals lazily inside `Effect.sync` / `try` (`globalThis.localStorage` inside `load`), not at import or make time. A "plain" adapter then still works in Node tests and when storage is blocked.
- A Layer's resource ends when the runtime is disposed: `FiberHandle.make()` inside the Layer is released by the scope and interrupts the guess fiber.

- Once the two Layers are built, the product calls **each use case constructor itself**. Do not hide them in a `makeUseCases(...)` that returns a record (see `effect-composition-root`).

## Quick test

Ask two questions: "Does making it run an Effect?" and "Must something be closed or interrupted when the app ends?" Two "no" = plain function.

## Red flags

- `Layer.succeed(Port, adapter)` for a sync adapter with no resource.
- A port declared with `Context.Service` "so it can be provided".
- A use case that `yield*`s a tag to find its state (hidden dependency, `R` grows).
- A third Layer appears: write down which of the two questions it answers "yes" to.
