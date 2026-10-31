import { readdirSync, readFileSync, existsSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
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
  "@guess/guesser-adapter-local-storage": ["@guess/guesser-domain", "@guess/core", "effect"],
  "@guess/guesser-state": ["@guess/guesser-application", "@guess/core", "effect"],
  "@guess/guesser-browser-react": [
    "@guess/guesser-state",
    "@guess/guesser-application",
    "@guess/core",
    "effect",
    "react",
    "react-dom",
  ],
  "@guess/guesser-browser-dom": [
    "@guess/guesser-state",
    "@guess/guesser-application",
    "@guess/core",
    "effect",
  ],
  "@guess/product-react": [
    "@guess/guesser-browser-react",
    "@guess/guesser-state",
    "@guess/guesser-application",
    "@guess/guesser-adapter-local-storage",
    "@guess/core",
    "effect",
    "react",
    "react-dom",
  ],
  "@guess/product-dom": [
    "@guess/guesser-browser-dom",
    "@guess/guesser-state",
    "@guess/guesser-application",
    "@guess/guesser-adapter-local-storage",
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

/**
 * Names imported from "effect" (or "effect/...") in one source text, type imports included.
 * A namespace import gives "*", a default import gives "default".
 * @param {string} source
 * @returns {string[]}
 */
export function effectImports(source) {
  const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
  const names = [];
  const pattern = /\b(?:import|export)\s+(?:type\s+)?([^;"']*?)\s*from\s*["']effect(?:\/[^"']*)?["']/g;
  for (const match of code.matchAll(pattern)) {
    const clause = match[1].trim();
    const braces = clause.match(/\{([^}]*)\}/);
    if (braces) {
      for (const part of braces[1].split(",")) {
        const name = part.trim().replace(/^type\s+/, "").split(/\s+as\s+/)[0].trim();
        if (name !== "") names.push(name);
      }
    }
    const outside = clause.replace(/\{[^}]*\}/, "").replace(/,/g, " ").trim();
    if (outside.startsWith("*")) names.push("*");
    else if (outside !== "") names.push("default");
  }
  // Side-effect import: import "effect"
  if (/\bimport\s*["']effect(?:\/[^"']*)?["']/.test(code)) names.push("*");
  return names;
}

/**
 * Domain value objects and operations may import only `Data` from "effect".
 * Checks every non-test file under packages/<...>/domain/src/vo and .../operations.
 * @param {string} root
 * @returns {string[]} one message per violation
 */
export function checkDomainEffectImports(root) {
  const packagesDir = join(root, "packages");
  if (!existsSync(packagesDir)) return [];
  const errors = [];
  const visit = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "node_modules") continue;
      const path = join(dir, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (/\.(ts|tsx|mts)$/.test(entry.name) && !/\.test\.[mc]?tsx?$/.test(entry.name)) {
        const rel = relative(root, path).split(sep).join("/");
        if (!/(^|\/)domain\/src\/(vo|operations)\//.test(rel)) continue;
        for (const name of effectImports(readFileSync(path, "utf8"))) {
          if (name !== "Data") errors.push(`${rel}: imports ${name} from "effect"; only Data is allowed in vo and operations`);
        }
      }
    }
  };
  visit(packagesDir);
  return errors;
}

const isMain = process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const errors = [...checkDeps(readPackages(root)), ...checkDomainEffectImports(root)];
  if (errors.length > 0) {
    for (const error of errors) console.error(error);
    process.exit(1);
  }
  console.log("check:deps: all package dependencies and domain imports are allowed");
}
