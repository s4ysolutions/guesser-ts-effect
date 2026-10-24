import { readdirSync, readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Allowed `dependencies` per package (spec 4.1). Dev dependencies are not checked.
const allowed = {
  "@guess/core": [],
  "@guess/guesser-domain": ["@guess/core", "effect"],
  "@guess/guesser-adapter-longest-match": ["@guess/guesser-domain", "@guess/core", "effect"],
  "@guess/guesser-adapter-jev": ["@guess/guesser-domain", "@guess/core", "effect"],
  "@guess/guesser-application": [
    "@guess/guesser-domain",
    "@guess/guesser-adapter-longest-match",
    "@guess/core",
    "effect",
  ],
  "@guess/interaction-domain": ["@guess/core", "effect"],
  "@guess/interaction-adapter-local-storage": ["@guess/interaction-domain", "@guess/core", "effect"],
  "@guess/interaction-application": [
    "@guess/interaction-domain",
    "@guess/guesser-application",
    "@guess/core",
    "effect",
  ],
  "@guess/presentation-react": [
    "@guess/interaction-application",
    "@guess/guesser-application",
    "@guess/core",
    "effect",
    "react",
    "react-dom",
  ],
  "@guess/presentation-dom": [
    "@guess/interaction-application",
    "@guess/guesser-application",
    "@guess/core",
    "effect",
  ],
  "@guess/product-react": [
    "@guess/presentation-react",
    "@guess/interaction-application",
    "@guess/guesser-application",
    "@guess/interaction-adapter-local-storage",
    "@guess/core",
    "effect",
    "react",
    "react-dom",
  ],
  "@guess/product-dom": [
    "@guess/presentation-dom",
    "@guess/interaction-application",
    "@guess/guesser-application",
    "@guess/interaction-adapter-local-storage",
    "@guess/core",
    "effect",
  ],
};

/**
 * @param {{ name: string, dependencies?: Record<string, string> }[]} packages
 * @returns {string[]} one message per violation; empty when the repo is clean
 */
export function checkDeps(packages) {
  const errors = [];
  for (const pkg of packages) {
    const allowedDeps = allowed[pkg.name];
    if (allowedDeps === undefined) {
      errors.push(`${pkg.name}: package is not in the allowed table`);
      continue;
    }
    for (const dep of Object.keys(pkg.dependencies ?? {})) {
      if (!allowedDeps.includes(dep)) {
        errors.push(`${pkg.name}: ${dep} is not allowed`);
      }
    }
  }
  return errors;
}

/**
 * Reads packages/<...>/package.json files under the repo root.
 * Packages that do not exist yet are simply not returned.
 * @param {string} root
 * @returns {{ name: string, dependencies?: Record<string, string> }[]}
 */
export function readPackages(root) {
  const packagesDir = join(root, "packages");
  if (!existsSync(packagesDir)) return [];
  const manifests = [];
  const visit = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "node_modules") continue;
      const path = join(dir, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (entry.name === "package.json") manifests.push(path);
    }
  };
  visit(packagesDir);
  return manifests.map((path) => JSON.parse(readFileSync(path, "utf8")));
}

const isMain = process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const errors = checkDeps(readPackages(root));
  if (errors.length > 0) {
    for (const error of errors) console.error(error);
    process.exit(1);
  }
  console.log("check:deps: all package dependencies are allowed");
}
