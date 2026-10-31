import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { checkDeps, checkDomainEffectImports, readPackages } from "./check-deps.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("reports a @guess dependency that the table does not allow", () => {
  const errors = checkDeps([
    {
      name: "@guess/guesser-domain",
      dependencies: { "@guess/core": "workspace:*", "@guess/guesser-adapter-jev": "workspace:*" },
    },
  ]);
  assert.deepEqual(errors, [
    "@guess/guesser-domain: @guess/guesser-adapter-jev is not allowed",
  ]);
});

test("accepts allowed @guess and external dependencies", () => {
  const errors = checkDeps([
    {
      name: "@guess/guesser-domain",
      dependencies: { "@guess/core": "workspace:*", effect: "4.0.6" },
    },
  ]);
  assert.deepEqual(errors, []);
});

test("reports an external dependency that the table does not allow", () => {
  const errors = checkDeps([
    { name: "@guess/guesser-domain", dependencies: { react: "19.3.1" } },
  ]);
  assert.deepEqual(errors, ["@guess/guesser-domain: react is not allowed"]);
});

test("ignores devDependencies", () => {
  const errors = checkDeps([
    {
      name: "@guess/guesser-domain",
      dependencies: { "@guess/core": "workspace:*" },
      devDependencies: { react: "19.3.1", "@guess/guesser-adapter-jev": "workspace:*" },
    },
  ]);
  assert.deepEqual(errors, []);
});

test("reports a package that is not in the table", () => {
  const errors = checkDeps([{ name: "@guess/mystery", dependencies: {} }]);
  assert.deepEqual(errors, ["@guess/mystery: package is not in the allowed table"]);
});

test("the real repo has no disallowed dependencies", () => {
  const packages = readPackages(repoRoot);
  assert.ok(packages.length > 0, "expected at least one package under packages/");
  assert.deepEqual(checkDeps(packages), []);
});

const makeDomainRepo = (files) => {
  const root = mkdtempSync(join(tmpdir(), "check-deps-"));
  const src = join(root, "packages", "features", "x", "logic", "domain", "src");
  for (const [name, text] of Object.entries(files)) {
    mkdirSync(dirname(join(src, name)), { recursive: true });
    writeFileSync(join(src, name), text);
  }
  return root;
};

test("vo and operations may import Data from effect; workflows and tests may import more", () => {
  const root = makeDomainRepo({
    "vo/e.ts": 'import { Data } from "effect"\nexport class E extends Data.TaggedError("E")<{}> {}\n',
    "operations/f.ts": 'import type { Bits } from "@guess/core"\nexport const f = (b: Bits) => b\n',
    "operations/f.test.ts": 'import { Effect } from "effect"\n',
    "workflows/w.ts": 'import { Effect } from "effect"\n',
  });
  assert.deepEqual(checkDomainEffectImports(root), []);
});

test("reports the file and the name when vo or operations import more than Data from effect", () => {
  const root = makeDomainRepo({
    "vo/bad.ts": 'import type { Effect } from "effect"\nexport type X = Effect.Effect<void>\n',
    "operations/bad.ts": 'import {\n  Data,\n  Option,\n} from "effect"\n',
  });
  assert.deepEqual(checkDomainEffectImports(root).sort(), [
    'packages/features/x/logic/domain/src/operations/bad.ts: imports Option from "effect"; only Data is allowed in vo and operations',
    'packages/features/x/logic/domain/src/vo/bad.ts: imports Effect from "effect"; only Data is allowed in vo and operations',
  ]);
});

test("the real repo keeps vo and operations free of effect imports other than Data", () => {
  assert.deepEqual(checkDomainEffectImports(repoRoot), []);
});
