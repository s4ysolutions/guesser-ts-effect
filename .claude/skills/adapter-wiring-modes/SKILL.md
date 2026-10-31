---
name: adapter-wiring-modes
description: Use when a TypeScript feature package must choose between creating its default adapter itself and receiving all adapters from the product, when a use case constructor has an optional gateway argument, or when asked why an application package imports an adapter.
---

# Wiring modes: self-contained vs open

An adapter is either created by the feature (**self-contained**) or received from the product (**open**). Both exist in this repo on purpose, inside one feature, `guesser`: the gateway is self-contained, both repositories are open. The trade-off is language-neutral; compare vocabla-mill `composition-root` and `hexagonal-feature-layout`. The default-argument code is TS.

## Self-contained: the gateway

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

- **Gain:** the product wiring is short; the guess works as one block.
- **Cost:** `guesser-application` depends on `guesser-adapter-longest-match`. This breaks the strict hexagon rule. The package table allows it explicitly (`package-per-layer`). Replacing the algorithm means editing the application package or passing `gateway` in every constructor that takes it. `RequestGuess` and `SetWindowSize` each create their own gateway; if they must share one instance, the caller passes the same one to both.

## Open: the repositories

`RoundsRepository` and `WindowSizeRepository` are ports in `guesser-domain`. Application only declares them:

```ts
GuessState.layer({ windowSizeRepository })
RoundsState.layer({ repository })
makePressBit({ roundsState, repository, takeGuess, requestGuess })
makeSetWindowSize({ guessState, windowSizeRepository })
```

The product creates `makeLocalStorageRoundsRepository()` and `makeLocalStorageWindowSizeRepository()` (both in `guesser-adapter-local-storage`) and passes them in. Application never imports that adapter.

- **Gain:** application depends only on the domain ports; swapping storage touches only the products.
- **Cost:** every product repeats the wiring lines; a forgotten argument is a compile error, which is fine.

## Choosing

| Question | self-contained | open |
|---|---|---|
| Is there one obvious default adapter? | yes | no |
| Does a product need to choose the technology? | no | yes |
| Is the adapter pure (no IO config)? | yes | usually no |

Default to open. When in doubt, for example one obvious local adapter today but a remote one planned, choose open. In open mode the adapter argument is required, never optional. Choose self-contained only when you accept the extra dependency and say so in the package table. Do not make the optional argument hide a dependency in a global.
