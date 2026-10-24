---
name: gateway-multi-adapter
description: Use when one port needs several adapters, such as a local algorithm and a remote HTTP service, when mapping HTTP, timeout and abort errors to tagged domain errors, or when a reference adapter must not be wired into a browser product.
---

# One gateway port, several adapters

Language-neutral idea from vocabla-mill `client-gateway-port` and `client-gateway-jvm-contract-test`: the port speaks domain words only; each adapter maps its own world to them. Code is TS + Effect.

## The port (`guesser/domain/src/guess.ts`)

```ts
export interface GuessGateway {
  readonly guess: (lastBits: Bits) => Effect.Effect<Guess, GuessFailed>
}
export type GuessFailed = Unavailable | BadAnswer | Timeout   // Data.TaggedError
```

Nothing about algorithms or services. The port stays async (`Effect`) even though the main adapter is instant, so a remote adapter fits without change.

## Adapter 1: longest match (used by products)

`makeLongestMatchGateway()` wraps a pure `predictNext` in `Effect.sync`. It never fails. The pure function has its own tests.

## Adapter 2: Jev (reference only)

`adapter-jev` sends the bits as one Choice question over `fetch` with `{ apiKey, baseUrl }` config. Mapping: HTTP error, 401, 429, network failure -> `Unavailable`; missing or wrong fields -> `BadAnswer`; over 10 s -> `Timeout`; interrupting the fiber aborts the fetch (`AbortSignal`).

**It is not wired into any product, because of CORS**: a browser page cannot call that API directly, and an API key must not ship in a browser bundle. It stays as proof the port fits a second technology. Only its own tests import it (`package-per-layer`).

Config can carry more than the key: a `timeoutMs` and a `fetch` function (default `globalThis.fetch`) make the timeout and abort tests possible. Mapping 429 to `Unavailable` is a choice: callers need only "no answer now", and there is no retry. `Timeout` comes from `Effect.timeoutOrElse`; the fiber interrupt aborts the request through `AbortSignal`. Enforcement of "only its own tests import `adapter-jev`" is the table in `package-per-layer`.

## Rules

- Each adapter returns the same error types; the application turns them into `Failed` state (`effect-usecase-command`).
- Adapters are plain `make…` functions with config as arguments (`when-to-use-layer`).
- Test remote adapters with a fake `fetch` argument; test timeout and abort, not only success.
- Add an adapter without changing the port. If the port must change, the adapter leaked into the domain.
