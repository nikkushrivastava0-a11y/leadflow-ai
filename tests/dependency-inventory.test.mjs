import test from "node:test";
import assert from "node:assert/strict";
import { packageFromSpecifier, extractPackageImports, auditDependencies } from "../scripts/audit-dependencies.mjs";

test("extracts scoped and unscoped package roots, skips relative and builtins", () => {
  assert.equal(packageFromSpecifier("@supabase/ssr/helpers"), "@supabase/ssr");
  assert.equal(packageFromSpecifier("lucide-react"), "lucide-react");
  assert.equal(packageFromSpecifier("next/navigation"), "next");
  assert.equal(packageFromSpecifier("node:fs"), null);
  assert.equal(packageFromSpecifier("@/lib/types"), null);
  assert.equal(packageFromSpecifier("./local"), null);
});

test("detects import, export-from, dynamic import, require and CSS plugin", () => {
  const source = [
    'import { Button } from "@/components/ui/button";',
    'import type { X } from "react";',
    'export { x } from "@supabase/ssr";',
    'const d = await import("date-fns");',
    'const x = require("lucide-react");',
    '@plugin "tw-animate-css";',
  ].join("\n");
  assert.deepEqual([...extractPackageImports(source)].sort(), [
    "@supabase/ssr", "date-fns", "lucide-react", "react", "tw-animate-css",
  ]);
});

test("inventory does not conflate absent imports with confirmed unused dependencies", () => {
  const report = auditDependencies({
    dependencies: { react: "1", "next-themes": "1" },
    devDependencies: { typescript: "1" },
  }, ['import React from "react";', 'import x from "unlisted";']);
  assert.deepEqual(report.undeclaredImports, ["unlisted"]);
  assert.deepEqual(report.reviewCandidates, ["next-themes"]);
  assert.equal(report.productionCount, 2);
  assert.equal(report.developmentCount, 1);
});

test("rejects false positives in comments and arbitrary strings only by conservative review", () => {
  const report = auditDependencies({ dependencies: { react: "1" } }, ["const value = 'react';"]);
  assert.deepEqual(report.referenced, []);
});
