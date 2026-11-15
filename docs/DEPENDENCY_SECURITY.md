# Dependency security candidate — 15 November 2026

The existing candidate used Next 16.2.9. The npm advisory database reported runtime high/critical issues, including framework advisories; affected runtime inventory was 27 advisories before this change. This is package inventory, not evidence of exploitation or proof every vulnerable path was reachable.

This separate draft upgrades Next and eslint-config-next to 16.4.6 and refreshes compatible transitive dependencies. It removes the shadcn scaffolding CLI from application dependencies. Its sole build-time CSS import is copied verbatim to src/app/shadcn-variants.css with the original MIT license in THIRD_PARTY_NOTICES.md, preserving existing animations/variants without the CLI server/toolchain dependency graph.

The production-only audit must pass in CI. Seven moderate development-tool inventory findings through typescript-eslint/minimatch remained after compatible audit fixes; they are not production dependencies and are not presented as resolved. No forced major tooling downgrade or unreviewed override is applied. Review updated tooling releases before accepting arbitrary untrusted repository files in the lint pipeline.

Run npm ci, npm audit --omit=dev, offline tests, typecheck/lint, production build, HTTP smoke and both seeded Chromium journeys on this PR. The prior #72 success alone does not certify the upgraded framework. Check the actual PR Actions results.

Incremental service cost: ₹0; no resource or paid tier is created. Risk: framework/toolchain regressions, mitigated by repeating the complete synthetic release suite. Rollback: revert this dependency PR and restore its parent lockfile only in an isolated environment; that reintroduces the known advisory inventory, so do not deploy the old framework as an approved public release. Production is untouched and still requires isolated hosted staging, backup verification, provider acceptance and explicit release approval.
