# Guess: a 0/1 guesser — design

Date: 2026-10-23
Status: draft, waiting for approval

## 1. What this is and why

A small frontend-only app. The user presses 0 or 1. Before each press, a guesser has
already guessed the next bit from the last N bits. After the press the app shows the guess
and whether it was a hit. The user "wins" by staying unpredictable (guesser near 50%).

The app is small on purpose. It is a learning case with three goals:

1. **Use TS Effect in an app that is built like a real one**: full hexagonal layers, one
   package per layer, a composition root per product.
2. **Integrate Jev** (TypeSafe System One model) as an adapter behind a port that knows
   nothing about Jev. Jev cannot be called from the browser (see 3), so the Jev adapter is a
   **reference adapter**: it is built and tested, but no product wires it. The products use
   an in-process **longest-match** adapter. Two adapters behind one port also prove that the
   port does not depend on Jev.
3. **Write skills** (in this repo, `.claude/skills/`) from the practices this project
   proves. The vocabla-mill skills are the starting point and reference.

The main problem it solves comes from vocabla-mill: the application layer there was not
the same thing across the logic part. To keep the app layer free of UI code, a bridge
was needed (ZIO ↔ Airstream), and use cases were replaced by Stores, because on the
frontend state lives in memory and "a use case that changes in-memory state" became a
factory of state accessors and modifiers. This project shows a shape where use cases
stay use cases.

## 2. Goals, non-goals, anti-goals

**Goals**
- Logic (domain + application) is pure Effect code and knows nothing about any UI.
- Two independent presentations and two products: React, and DOM without a framework.
  Both show the same screen.
- Two features that show two ways to wire adapters:
  - **guesser — self-contained**: its application layer creates its own adapter
    (longest-match).
  - **interaction — open**: its application layer only declares a repository port; the
    product creates the adapter (local storage) and passes it in.
- Architecture is checked by the build: a wrong import fails to compile.
- A set of skills in `.claude/skills/` that describe the proven practices.

**Non-goals**
- No backend, no proxy, no deploy.
- Jev is not used at runtime by any product.
- No 3rd product now. The design only has to make one possible (a product without local
  storage).
- No RxJS, no `effect-atom` (formerly `@effect-rx`). The point is to own the bridge.
  `effect-atom` may be read as prior art.
- No changes to any other repo (`~/s4y/vocabla-mill`, `~/s4y/meridian`). Read only.

**Anti-goals (the project fails even if it works, if…)**
- A presentation package owns game state, or calls an adapter directly.
- React components or DOM views see Effect types (`Effect`, `Stream`, `Layer`). Effect
  stops at the bridge.
- A "God object" per feature appears (a view-model-like object with all state and all
  actions).
- Names that give wrong hints: `ViewModel` (Android lifecycle meaning), `Store`
  (state + logic merged in one class), `Service` for things other than Effect services,
  `View` for a reactive value (sounds like a component). `Rx` was considered and dropped
  (see 4.4).
- A use case that is a factory (creates accessors/modifiers for the caller).
- A class or object holding a group of use cases (`InteractionUseCases { press, reset, … }`).
  It hides each use case's real dependencies. One command ↔ one `UseCase<C>`.
- A `Layer` (and a service tag) for a service that has a plain constructor and nothing to
  release. Layers are constructors; they earn their place only for effectful creation or
  resource lifetime (see 4.6).
- The guesser port or domain mentions Jev, prompts, questions or API keys.

## 3. Constraints

- TypeScript everywhere. Effect **4.x** (`latest` on npm is 4.0.6 at the time of writing).
  Use v4 APIs: `Context.Service`, `Layer`, `ManagedRuntime`, `SubscriptionRef.changes`.
- pnpm workspaces (local pnpm 11.6, Node 24). Vite for both products, Vitest for tests.
- "Pure JS" product means **no UI framework**; it is still TypeScript with a build, because
  Effect comes from npm.
- Jev's API (`POST https://api.typesafe.ai/v1/systemone`) rejects browser calls: a CORS
  preflight from `http://localhost:5173`, `http://localhost:3000`, `http://127.0.0.1:5173`
  and `https://example.com` returns `400 Disallowed CORS origin` (checked 2026-10-23; only
  `https://console.typesafe.ai` is allowed). This is why Jev is a reference adapter only.
- English at B1 level in docs and skills.

## 4. Architecture (decided)

### 4.1 Layers and packages

One package per layer. Each `package.json` lists only the packages it may import.

```
packages/
  core/                              shared kernel: Bit, Bits (+ "last N" helper),
                                     UseCaseCommand<Response>, UseCase<C>, ResponseOf<C>
  guesser/
    domain/                          GuessGateway port, Guess, GuessFailed
    application/                     use case constructors + GuessState layer (creates longest-match)  ← self-contained
    adapter-longest-match/           in-process algorithm, used by products and tests
    adapter-jev/                     reference adapter: REST via fetch, not wired in any product
  interaction/
    domain/                          Round, Rounds, Score, RoundsRepository port
    application/                     use case constructors + RoundsState layer (takes a RoundsRepository)  ← open
    adapter-local-storage/           RoundsRepository on local storage
  presentation-react/                React bridge (hooks) + components
  presentation-dom/                  DOM bridge (EventTarget) + DOM views
  product-react/                     Vite app, composition root
  product-dom/                       Vite app, composition root
```

Package names: `@guess/<path-with-dashes>`, e.g. `@guess/guesser-application`.

Allowed dependencies (arrow = "may import"):

```
core            ← every package
*-domain        → core, effect
guesser-application     → guesser-domain, guesser-adapter-longest-match, core
interaction-application → interaction-domain, guesser-application (use cases only), core
adapter-*       → its feature's domain, core
presentation-*  → *-application (use cases only), core, effect (bridge only)
product-*       → presentation-*, *-application, adapter-* it wires
```

`guesser-application → guesser-adapter-longest-match` breaks the strict hexagon rule on
purpose. It is the cost of option "self-contained", and the skills must say so. Domain
packages never import adapters. Nothing imports `guesser-adapter-jev` except its own tests.

### 4.2 Where state lives

All state the UI shows lives in the application layers, not in presentation. Both UIs need
the same state, so no presentation owns it.

- Live state is an **Effect service** in the application layer: a `Context.Service` holding
  a `SubscriptionRef`, built once by a `Layer` (its creation is effectful, see 4.6). It is
  not a port. Its shape is internal: only the feature's own use case constructors read or
  write the ref. The product sees it only as a value to pass into those constructors.
- Saving and loading go through a **repository port** only where there is a real choice of
  technology (interaction). The live state loads from the repository at start and saves on
  change.

### 4.3 Use cases: Command + UseCase<C>

The same pattern as the vocabla-mill backend (`usecase-command` skill), mapped to TS + Effect.

- A **command** is plain data describing intent. It carries its response type.
- A **use case** is a handler for exactly one command type: `UseCase<C>`.
- Presentation (and other features) depend only on `UseCase<C>`. Dependencies (state
  services, ports, other features' use cases) are arguments of the use case's **plain
  constructor function**, so they never appear in the use case's type.

Core types (no Effect import):

```ts
declare const ResponseType: unique symbol
export interface UseCaseCommand<Response> { readonly [ResponseType]?: Response }  // phantom
export type ResponseOf<C> = C extends UseCaseCommand<infer R> ? R : never
export interface UseCase<C extends UseCaseCommand<unknown>> { (command: C): ResponseOf<C> }
```

TS has no path-dependent types (Scala's `command.Response`), so the response type rides on a
phantom type parameter. The exact encoding may change if TS needs it; the shape must stay:
the command type alone fixes the response type.

Feature code:

```ts
export class PressBit extends Data.TaggedClass("PressBit")<{ readonly bit: Bit }>
  implements UseCaseCommand<Effect.Effect<void>> {}

export const makePressBit = (deps: {
  readonly roundsState: RoundsState              // state service value
  readonly repository: RoundsRepository          // port
  readonly takeGuess: UseCase<TakeGuess>         // other feature's use cases
  readonly requestGuess: UseCase<RequestGuess>
}): UseCase<PressBit> => (command) => /* Effect.gen(…) */
```

No tag and no `Layer` for use cases: they have a plain constructor and nothing to release.

Two kinds of response:
- **command**: `Effect<A, never>`.
- **observe**: `Stream<A>`. Emits the current value first, then every change (that is what
  `SubscriptionRef.changes` gives). Observe commands are named `ObserveX`.

Rules:
- One command ↔ one `make…` constructor returning `UseCase<C>`, in one file with its command.
- A use case never creates accessors or modifiers for its caller (no factories). Its
  constructor is called once, by the composition root; callers get the finished `UseCase<C>`.
- The `R` of every response is `never`. All dependencies are constructor arguments.
- Responses that presentation runs have error type `never`. Failures become state that an
  observe use case shows (for example the guess status `failed(reason)`).
- Each state has one owner feature. Only the owner's use cases write to it. Another feature
  changes it only by calling the owner's use cases.
- Use case files for one state sit in one folder (`rounds/` holds `PressBit`, `ResetRounds`,
  `ObserveRounds`). The folder is the grouping; there is no grouping type.
- Effect's `Request.TaggedClass` is **not** used: it is made for batching with resolvers and
  its response is a value, not a `Stream`, so it gives a wrong hint.
- Cost note (measured with Effect 4.0.6 on Node 24): creating an observe `Stream` is ~0.7 µs
  (a lazy description). Each running subscriber costs ~6 KB and ~2 µs per update. Cost is per
  subscriber, not per state, so no other observing API is needed.

### 4.4 Bridges (driving adapters)

The bridges are Effect-aware. They turn use cases into a presentation-specific API. The
grouping ("press and reset change rounds") is written in each bridge separately. This is
wanted: each presentation is independent and may expose a different subset.

No `Rx`, `LiveValue` or `Command` type exists. `Stream` and `Effect` are already those
shapes. (An `Rx` grouping type was discussed and dropped: its only value was to stop two
bridges from drifting, and the products are meant to be independent.)

- The product passes the finished `UseCase<C>` values to the bridge explicitly, plus the
  `ManagedRuntime` the bridge uses to **run** the Effects and Streams they return. Bridges
  never look anything up by tag.
- **React**: a provider (React context holding the runtime and the product's use cases), two
  generic helpers `useObserve(observeRounds, new ObserveRounds())` (runs the `Stream`) and
  `useRun(pressBit)` (returns `(command) => void`), and per-state custom hooks built from
  them, e.g. `useRounds() → [rounds, { press, reset }]`.
- **DOM**: the same idea with native events. Per state, an object that extends
  `EventTarget`, dispatches a `change` event (`CustomEvent` with the value in `detail`),
  has a `value` getter for the latest value, and has the command methods, e.g.
  `rounds.addEventListener("change", …)`, `rounds.press(1)`.
- Stopping: the React subscription fiber is interrupted on unmount; the DOM bridge
  interrupts on an explicit `dispose()`.

### 4.5 Composition root (products)

Each product's root has two phases, and calls every constructor itself (no per-feature
wiring function that returns a record of use cases):

```ts
// plain adapters
const repository = makeLocalStorageRoundsRepository()

// phase 1 — effectful and scoped: only what 4.6 allows
const runtime = ManagedRuntime.make(Layer.mergeAll(
  GuessState.layer,
  RoundsState.layer({ repository }),   // loads saved rounds at start
))
const { guessState, roundsState } = await runtime.runPromise(
  Effect.all({ guessState: GuessState, roundsState: RoundsState }))

// phase 2 — plain constructors, each called once
const takeGuess    = makeTakeGuess({ guessState })
const requestGuess = makeRequestGuess({ guessState })   // creates longest-match itself
const pressBit     = makePressBit({ roundsState, repository, takeGuess, requestGuess })
// … the other use cases

mount(runtime, { pressBit, /* … */ })
```

Then: request the first guess, and dispose the runtime on page unload (this interrupts the
guess fiber). Products contain no business logic.

### 4.6 When to use a Layer

A `Layer` is a constructor with memoization and a scope. Use one **only** when the service
has effectful creation and/or owns a resource that must be released. Otherwise use a plain
constructor function and pass values.

In this app that leaves exactly two Layers:

| Service | Effectful creation | Owns a resource | Layer |
|---|---|---|---|
| use cases (~9) | no | no | no |
| `LocalStorageRoundsRepository`, `LongestMatchGateway`, `JevGateway` | no | no | no |
| `RoundsState` | yes: `SubscriptionRef.make`, first `load` | no | yes |
| `GuessState` | yes: `SubscriptionRef.make` | yes: background guess fiber, interrupted on dispose | yes |

Ports are plain TS interfaces, not service tags. A Layer that needs a plain dependency takes
it as a function argument (`RoundsState.layer({ repository })`), not through `R`.

This goes against the common Effect habit of "a Layer for everything". The skill must state
the rule and the reason, so the code does not read as "they did not know Layers".

## 5. Features

### 5.1 core
- `Bit = 0 | 1`.
- `Bits`: an immutable list of bits with `lastN(n)` and `toString()` (`"0110…"`).

### 5.2 guesser (self-contained)

**Domain**
- `Guess = { bit: Bit; confidence?: number }` (`confidence` 0..1, optional so an adapter
  can leave it out).
- `GuessFailed`: tagged errors `Unavailable`, `BadAnswer`, `Timeout`.
- Port `GuessGateway`: `guess(lastBits: Bits) => Effect<Guess, GuessFailed>`. Nothing about
  any algorithm or service. The port stays async (`Effect`) even though the main adapter is
  instant, so a remote adapter fits without change.

**Application — internal state**
- `GuessState`: `idle | thinking | ready(Guess) | failed(GuessFailed)`.
- Window size N (how many last bits the gateway gets).
- Both live in `GuessState` (one service, one `Layer`, owns the guess fiber). Its shape is
  internal to guesser.

**Application — use cases** (command → response)
- `ObserveGuessStatus` → `Stream<GuessStatus>` — status **without the bit**
  (`idle | thinking | ready | failed(reason)`), so the UI cannot show the guess before the
  press.
- `RequestGuess { bits }` → `Effect<void>` — takes `lastN(N)`, starts the guess in a
  background fiber, interrupts the previous one if it still runs. Does not wait. With zero
  bits it does nothing and the status stays `idle`.
- `TakeGuess` → `Effect<Guess | null>` — returns the ready guess and sets state to `idle`;
  `null` if not ready.
- `SetWindowSize { n }` → `Effect<void>`, `ObserveWindowSize` → `Stream<number>`. Changing N
  interrupts a running guess, drops a ready one, and requests a new guess with the current
  bits.
- Self-contained: `makeRequestGuess({ guessState, gateway? })` creates `LongestMatchGateway`
  itself when `gateway` is not given. Products never pass it; tests pass a fake.
- interaction gets `UseCase<TakeGuess>` and `UseCase<RequestGuess>` as constructor arguments.

**Longest-match adapter (used by products)**
The classic "longest suffix match" predictor (as in the Aaronson oracle):
1. Let `h` be the bits it got (length L ≥ 1).
2. For k from L−1 down to 1: take the last k bits of `h` (the suffix). Find the **most
   recent** earlier place in `h` where that suffix also appears and is followed by at least
   one bit. If found, the guess is the bit that followed it. `confidence = k / (L − 1)`.
3. If no suffix of length ≥ 1 appears earlier: guess the bit that is more common in `h`;
   on a tie, guess the opposite of the last bit. No `confidence`.
4. Never fails.

Pure function plus a thin `Layer`. It searches only inside the bits it gets, so N limits
its memory.

**Jev adapter (reference, not wired)**
- Config: `{ apiKey, baseUrl }` passed into its `Layer`. No key store, no UI.
- Sends `state` = the bits as a string, one **Choice** question ("which bit comes next")
  with options `"0"` and `"1"`, model `jev-latest`.
- Maps `choice` → `bit`, `confidence` → `confidence`.
- HTTP errors (including `401`, `429`, CORS/network failure) → `Unavailable`; missing or
  wrong fields → `BadAnswer`; over 10 s → `Timeout`. Interrupting the fiber aborts the
  `fetch` (`AbortSignal`).
- Tested only with a stubbed `fetch`.

### 5.3 interaction (open)

**Domain**
- `Round = { bit: Bit; guess: Bit | null; hit: boolean | null }` (`null` = no guess was ready).
- `Rounds`: ordered list of rounds.
- `Score = { hits, guessed, total, ratio }`: `guessed` = rounds with a guess,
  `total` = all rounds, `ratio = hits / guessed` (0 when `guessed` is 0).
- Port `RoundsRepository`: `load: Effect<Rounds>`, `save(rounds): Effect<void>`.

**Application — use cases** (folders `rounds/`, `score/`; command → response)
- `ObserveRounds` → `Stream<Rounds>`
- `ObserveScore` → `Stream<Score>` (derived from rounds)
- `PressBit { bit }` → `Effect<void>`:
  1. `TakeGuess` via guesser's `UseCase<TakeGuess>`,
  2. append the round, save,
  3. `RequestGuess` via guesser's `UseCase<RequestGuess>` with all bits.
- `ResetRounds` → `Effect<void>` — empties rounds, saves, status goes back to `idle`.
- At start: `RoundsState.layer({ repository })` loads the saved rounds; the product then
  requests the first guess.

**Local-storage adapter**
- Key `guess.rounds`. Decode with `Schema`. If decoding fails: start with empty rounds,
  copy the raw text to `guess.rounds.corrupt`, log a warning. History is never wiped
  without a copy. That is why `load` has error type `never`.

## 6. Screen (both products)

- Two big buttons **0** and **1**; keys `0` and `1` work too.
- Guess status line: "Guesser is thinking…", "Guesser is ready", "Guesser needs at least
  one bit", or the failure reason.
- After each press: the guess and hit/miss for that round.
- Score: "Guesser guessed 37 of 50 (74%)" (50 = `guessed`), plus "3 rounds without a guess"
  when there are any.
- History strip of recent rounds with hits/misses marked.
- Setting for N, and a Reset button.
- Buttons always work, also while the guesser is thinking or failed. Such rounds are saved
  with no guess.

## 7. Testing

- Domain and longest-match: plain unit tests (score maths, `lastN`, the algorithm on known
  sequences: e.g. `0101010` → `1`, a repeated pattern is learned, fallback rules).
- Application: Vitest with Effect, using a test `GuessGateway` (slow, failing, fixed) and an
  in-memory `RoundsRepository` value. Cover: press while thinking (old fiber interrupted,
  round has no guess), failure becomes state, reset, change of N.
- Local-storage adapter: round trip and the corrupt-data path.
- Jev adapter: stubbed `fetch` (request shape, each error mapping, abort on interrupt).
- Bridges: one small test each (subscribe gets the current value first; unmount/dispose
  stops the fiber).

## 8. Skills (deliverable)

Written after the code proves the practice, in `.claude/skills/`, using the
`superpowers:writing-skills` process. Planned set (names may change):

- feature layout: domain / application / adapters / presentation / product with Effect
- one package per layer and the allowed dependency table
- use cases: Command + `UseCase<C>` in TS + Effect (phantom response type, one constructor per
  command, dependencies as constructor arguments), observe (`Stream`) vs command (`Effect`), no
  factories, errors become state
- state in the application layer: internal `SubscriptionRef` service vs repository port
  (when a port is ceremony, when it is not)
- adapter wiring: self-contained vs open feature, and the cost of each
- gateway port with more than one adapter (local algorithm + remote reference adapter)
- React bridge and DOM bridge (driving adapters)
- composition root with `ManagedRuntime`: two phases (Layers, then plain constructors),
  every constructor called by the product
- when a Layer earns its place (effectful creation, resource lifetime) and when a plain
  constructor is enough
- naming: words to avoid and why (ViewModel, Store, Service, View, Rx)

Each skill says what is specific to TS/Effect and what is a language-neutral idea, and
points to the matching vocabla-mill skill where the idea came from.

## 9. Left to the builder

- Exact Jev Choice request/response JSON (read the TypeSafe docs at build time).
- The React hook's first render before the stream's first value (a short `undefined`/
  loading state is acceptable; no flicker after that).
- Visual style of the screen.
- Exact internal file names inside packages.
- tsconfig setup (project references or not), lint setup.

## 10. Calls I made (please check)

- Effect 4.x, pnpm, Vite, Vitest, TypeScript for the DOM product too.
- Package naming `@guess/...`.
- The hidden-guess rule: guess status is visible, the bit is not, until the press.
- `TakeGuess` / `RequestGuess` as the way interaction uses guesser.
- Bridge helper names `useObserve` / `useRun`.
- Default N = 32, allowed 1–256; N is kept by guesser in local storage (guesser is
  self-contained, so this is its own concern).
- Longest-match details: most recent match wins; fallback = majority bit, tie → opposite of
  the last bit; `confidence = k / (L − 1)`.
- The frequency adapter from the first draft is dropped; longest-match plus test gateways
  cover its job.
- Zero bits → no guess, so round 1 never has a guess.
- Score shows `hits / guessed`.
- Corrupt saved rounds → start empty, keep a copy.
- DOM bridge uses `EventTarget` + `CustomEvent("change")` (meridian uses a hand-written
  emitter; you asked for native JS events).
- How guesser is tested with a fake gateway while staying self-contained: an optional
  `gateway` argument on `makeRequestGuess`, which products never pass.
- Ports are plain interfaces; a Layer that needs one takes it as a function argument.
- The product requests the first guess after phase 2 (not inside a Layer).
