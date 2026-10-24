import { test } from "node:test";
import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { checkDeps, readPackages } from "./check-deps.mjs";

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
