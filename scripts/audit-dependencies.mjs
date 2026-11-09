#!/usr/bin/env node
/**
 * Conservative, offline package-use inventory. A missing static import is a
 * REVIEW CANDIDATE, never an automatic reason to uninstall a dependency.
 * Next plugins, CSS, build-time tools, generated files and runtime requires
 * can use packages without appearing in application imports.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const skipDirs = new Set(["node_modules", ".git", ".next", ".vercel", "coverage", "dist", "build"]);
const sourceExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".css", ".scss"]);
const scanDirs = ["src", "scripts"];
const scanConfig = [
  "next.config.ts", "next.config.js", "eslint.config.mjs",
  "postcss.config.mjs", "tailwind.config.ts", "tailwind.config.js",
];
const scriptText = readFileSync(join(root, "package.json"), "utf8");
const pkg = JSON.parse(scriptText);

function walk(directory, output) {
  try {
    for (const name of readdirSync(directory)) {
      if (skipDirs.has(name)) continue;
      const file = join(directory, name);
      const info = statSync(file);
      if (info.isDirectory()) walk(file, output);
      else if ([...sourceExtensions].some(ext => name.endsWith(ext))) output.push(file);
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

export function packageFromSpecifier(specifier) {
  if (!specifier || /^(?:[./#]|node:|@\/)/.test(specifier)) return null;
  if (/^(?:https?:|data:)/.test(specifier)) return null;
  const parts = specifier.split("/");
  return specifier.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
}

export function extractPackageImports(source) {
  const results = new Set();
  // Covers static imports, side-effect imports, export-from, require(),
  // dynamic import(), CSS @import and @plugin. Does not execute any code.
  const patterns = [
    /\b(?:import|export)\s+(?:[\s\S]*?\s+from\s*)?["']([^"'\n]+)["']/g,
    /\b(?:require|import)\s*\(\s*["']([^"'\n]+)["']\s*\)/g,
    /@(?:import|plugin)\s+["']([^"'\n]+)["']/g,
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      const dependency = packageFromSpecifier(match[1]);
      if (dependency) results.add(dependency);
    }
  }
  return results;
}

export function auditDependencies(manifest, sources) {
  const referenced = new Set();
  for (const source of sources) {
    for (const name of extractPackageImports(source)) referenced.add(name);
  }
  const production = Object.keys(manifest.dependencies || {}).sort();
  const development = Object.keys(manifest.devDependencies || {}).sort();
  const declared = new Set([...production, ...development]);
  return {
    productionCount: production.length,
    developmentCount: development.length,
    referenced: [...referenced].sort(),
    undeclaredImports: [...referenced].filter(name => !declared.has(name)).sort(),
    reviewCandidates: production.filter(name => !referenced.has(name)),
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const files = [];
  for (const dir of scanDirs) walk(join(root, dir), files);
  for (const path of scanConfig) {
    try {
      statSync(join(root, path));
      files.push(join(root, path));
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  const sources = files.map(path => readFileSync(path, "utf8"));
  const report = auditDependencies(pkg, sources);
  const lock = JSON.parse(readFileSync(join(root, "package-lock.json"), "utf8"));
  const lockedRoot = lock.packages?.[""];
  const rootMatches =
    JSON.stringify(lockedRoot?.dependencies || {}) === JSON.stringify(pkg.dependencies || {}) &&
    JSON.stringify(lockedRoot?.devDependencies || {}) === JSON.stringify(pkg.devDependencies || {});
  const output = {
    scannedFiles: files.length,
    ...report,
    packageLockRootMatchesManifest: rootMatches,
    caution: "Review candidates are NOT verified unused packages. Do not auto-remove.",
  };
  process.stdout.write(JSON.stringify(output, null, 2) + "\n");
  if (!rootMatches || report.undeclaredImports.length > 0) process.exitCode = 1;
}
