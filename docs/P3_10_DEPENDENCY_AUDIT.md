# P3-10a: Dependency inventory — review-only

This draft adds an offline inventory, a lockfile consistency check, synthetic unit tests and an advisory-report CI job. It **does not uninstall or upgrade** dependencies, change package versions, or make production changes.

## Commands

```sh
node --test tests/dependency-inventory.test.mjs
node scripts/audit-dependencies.mjs
npm ci
npm audit --omit=dev --audit-level=high
npx tsc --noEmit
npm run build
```

The scanner parses literal imports/exports/require/dynamic-import and CSS @plugin/@import in `src`, `scripts`, `tests`, and known config files. It checks manifest-to-lockfile root declarations and prints import names. `reviewCandidates` means **not referenced in these scanned files**; it does not establish that a package is unused. Next plugins, CSS, build scripts, dynamic imports with computed names, runtime require, transitive packages, and generated code can be missed. Static scan can also produce false positives; verify each candidate manually.

The audit workflow runs on the draft branch and PRs, without any Supabase connection, real payment keys or customer data. `npm audit` can make a registry advisory request in CI; it is deliberately nonblocking and reports only summary counts. A dependency vulnerability requires review, not an automatic upgrade. This does not establish software licensing, commercial terms, browser behaviour, or absence of vulnerabilities.

## Review gates

1. Inspect CI results and any advisory summaries; do not treat a green build as proof of production safety.
2. Before any package removal, check runtime import paths, Next plugins, CSS and bundle usage; open a **separate** small PR with full build/browser regression tests.
3. Confirm actual hosting plan, service terms and each dependency's applicable licence from official vendor sources before commercial rollout. Do not assume MIT or free-commercial rights.
4. Keep Supabase RLS policy changes, onboarding and payment verification in their existing separate security PRs.

**Scope:** P3-10a inventory only. P3-10 remains open until manual licence and deployment terms review, package-removal decisions and production-safe QA.
