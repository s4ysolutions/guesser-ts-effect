---
name: package-per-layer
description: Use when creating or splitting a workspace package in a pnpm TypeScript monorepo, adding a dependency between packages, or when the dependency check fails or a type-only package breaks pnpm test.
---

# One package per layer, with a checked dependency table

Idea from vocabla-mill `layers-to-modules` and `module-separation` (one build module per layer; the module graph enforces the hexagon). pnpm, `package.json` and the script are TS specific.

## Package template (every package)

```json
{
  "name": "@guess/guesser-application",
  "private": true,
  "type": "module",
  "exports": { ".": "./src/index.ts" },
  "scripts": { "test": "vitest run", "typecheck": "tsc -p tsconfig.json" },
  "dependencies": { "@guess/core": "workspace:*", "effect": "4.0.6" }
}
```

- Name: `@guess/<dir-path-with-dashes>`.
- **No build step.** `exports` points at the `.ts` source; other packages and Vite read it.
- `tsconfig.json` extends `tsconfig.base.json`. Sources and tests are in `src/`.
- **Type-only packages (no tests): `"test": "vitest run --passWithNoTests"`.** Plain `vitest run` exits with an error when it finds no tests and breaks root `pnpm test`.
- A package that reads `localStorage` in tests needs a vitest config with `environment: "jsdom"` (`interaction/application`).

- Test tools (`vitest`, `jsdom`) are `devDependencies` or come from the root; the check ignores dev dependencies. Put `vitest.config.ts` in the package root, not in `src/`.
- "Type-only" means the package has no test files (`guesser/domain`, `core` types).
- A new package (also a new feature's `<feature>-application`) has no wildcard rule: add its own row to `allowed` in `scripts/check-deps.mjs`, then its directory is picked up by pnpm's workspace glob.

## Allowed dependencies (`scripts/check-deps.mjs`)

```
core                     (nothing)
*-domain                 core, effect
adapter-*                its feature domain, core, effect
guesser-application      guesser-domain, guesser-adapter-longest-match, core, effect
interaction-application  interaction-domain, guesser-application, core, effect
presentation-*           *-application, core, effect (+ react, react-dom)
product-*                presentation-*, *-application, adapter-* it wires, core, effect (+ react)
```

`guesser-application -> guesser-adapter-longest-match` breaks the strict hexagon on purpose (see `adapter-wiring-modes`). Nothing imports `adapter-jev` except its own tests.

## The check

The table is a JS object in `scripts/check-deps.mjs`. `checkDeps(packages)` returns one message per violation, including "package is not in the allowed table". Only `dependencies` are checked, not dev, peer or optional. The root `test` script also runs `node --test scripts/check-deps.test.mjs`, so the negative cases run in `pnpm verify`. A new package fails the check until you add it to the table: that is the point. Mechanical rules go in the script; this skill is for the reasons.

## Red flags

- Editing the table to make a failing check pass without asking if the import is right.
- A domain package with `react` or an adapter in `dependencies`.
