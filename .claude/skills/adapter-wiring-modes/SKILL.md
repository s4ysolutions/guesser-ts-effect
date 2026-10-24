---
name: adapter-wiring-modes
description: Use when a TypeScript feature package must choose between creating its default adapter itself and receiving all adapters from the product, when a use case constructor has an optional gateway argument, or when asked why an application package imports an adapter.
---

# Wiring modes: self-contained vs open

A feature either picks its adapter itself (**self-contained**) or receives it from the product (**open**). Both exist in this repo on purpose. The trade-off is language-neutral; compare vocabla-mill `composition-root` and `hexagonal-feature-layout`. The default-argument code is TS.

## Self-contained: `guesser`

```ts
export const makeRequestGuess = (deps: {
  readonly guessState: GuessState["Service"]
  readonly gateway?: GuessGateway
}): UseCase<RequestGuess> => {
  const gateway = deps.gateway ?? makeLongestMatchGateway()
  ...
}
```

Products never pass `gateway`; tests pass a fake. `makeSetWindowSize` takes the same optional `gateway` as a plain argument (an earlier hidden WeakMap lookup was rejected).

- **Gain:** the product wiring is short; the feature works as one block.
- **Cost:** `guesser-application` depends on `guesser-adapter-longest-match`. This breaks the strict hexagon rule. The package table allows it explicitly (`package-per-layer`). Replacing the algorithm means editing the application package or passing `gateway` in every constructor that takes it. Two use cases that need the gateway must be given the **same** instance by the caller if that matters.

## Open: `interaction`

`RoundsState.layer({ repository })` and `makePressBit({ ..., repository, ... })`. The product creates `makeLocalStorageRoundsRepository()` and passes it.

- **Gain:** application depends only on the domain port; swapping storage touches only the product.
- **Cost:** every product repeats the wiring line; a forgotten argument is a compile error, which is fine.

## Choosing

| Question | self-contained | open |
|---|---|---|
| Is there one obvious default adapter? | yes | no |
| Does a product need to choose the technology? | no | yes |
| Is the adapter pure (no IO config)? | yes | usually no |

Default to open. When in doubt, for example one obvious local adapter today but a remote one planned, choose open. In open mode the adapter argument is required, never optional. Choose self-contained only when you accept the extra dependency and say so in the package table. Do not make the optional argument hide a dependency in a global.
