# Feature verification — 15 November 2026

Evidence below is limited to what ran. Source code, offline tests, HTTP/service integration and browser testing are distinct. No production database or customer records were read or changed during this feature implementation.

| Evidence | Outcome |
| --- | --- |
| Source review | Read AGENTS.md / CLAUDE.md, application/auth/CRM/form/payment sources, existing SQL proposals, tests and current PR55 metadata |
| Offline regressions | **100/100 pass**, including strict qualification, model privacy/fallback, provider error handling, email key/payload stability, actual worker authorization/failure behavior, reminder boundaries, report semantics, payment capture/signatures/failure, and existing owner/public regressions |
| TypeScript / ESLint | Pass on final implementation |
| Production build | Standard Next16 production build passes with synthetic public API configuration; no provider secrets |
| Built-app HTTP smoke | **19 pass**, including protected-page redirects, unauthenticated cron denial, disabled test access and disabled payment endpoints |
| PostgreSQL staging copy | Actual pg_dump/pg_restore of synthetic owner/RLS baseline; all seven feature migrations applied and reversed/reapplied successfully |
| Database security/behavior | Two-owner SELECT/write isolation, denied anonymous/private access, token-owned leases, immutable mail snapshot, 24h/3d/7d dedupe, 12 concurrent exact-contact merges, field preservation, test payment expiry/revocation, exact IST reports and atomic audit failure rollback pass |
| Official local services + Next HTTP | Official pinned Supabase Auth and PostgREST, real disposable sessions/refresh, RLS, generated Server Actions, new owner pages, private qualification/draft rendering, tenant isolation, guarded native multipart public action and signed receipt pass |
| Browser / physical phone | **Unverified.** Chromium could not launch due workspace socket restrictions. HTTP checks are not browser testing. No physical phone claim. |
| Hosted providers | **Unverified.** Actual Supabase hosted redirects/secret gateway, delivered Resend email, Gemini model acceptance/quality and genuine Razorpay TEST checkout/webhook require controlled acceptance. No messages or payments sent. |

The additional manual-create regression confirms an immediate rules estimate without a provider call; the worker is the sole current model-qualification path. The `src/lib/gemini.ts` helper remains for compatibility/regression coverage but is not imported by current lead creation.

## Reproduce

Use Node 24 and locked dependencies. The standard commands are in README. `security/tests/features-staging.mjs` refuses a nonempty database, non-loopback host, missing synthetic sentinel or a database name outside `leadflow_feature_*`. It creates only synthetic fixtures. It explicitly tests all feature migrations and reverse-order teardown. Existing PR55 SQL/concurrency tests remain available separately.

For the actual Auth/PostgREST/Next HTTP flow use a separate empty local database named `leadflow_jwt_*` and run:

```bash
export LEADFLOW_SYNTHETIC_ONLY=YES
export PGHOST=127.0.0.1 PGPORT=5432 PGUSER=postgres PGDATABASE=leadflow_jwt_features
export LEADFLOW_AUTH_BIN=/absolute/path/to/reviewed/auth
export LEADFLOW_POSTGREST_BIN=/absolute/path/to/reviewed/postgrest
export LEADFLOW_NEXT_FLOW=YES LEADFLOW_PUBLIC_NEXT_FLOW=YES LEADFLOW_FEATURE_FLOW=YES
node security/tests/local-auth-api.mjs
```

Pinned official Auth v2.197.0 and PostgREST v16.5 binary digests are verified in that runner; download/archive checksums are in the existing PR55 release-gate workflow. Do not substitute hosted credentials or run against a real project. Defaults use ports 55440–55444; set LEADFLOW_AUTH_PORT, LEADFLOW_REST_PORT, LEADFLOW_GATEWAY_PORT, LEADFLOW_NEXT_PORT and LEADFLOW_PUBLIC_TLS_PORT to distinct local ports if needed. This fixture builds a real Next app with narrow synthetic TLS/DNS/API-key infrastructure and does not relax production URL or TLS validation. It overwrites local `.next` artifacts, so rebuild with your intended safe development configuration afterwards.

The final implementation's standard production build and HTTP smoke were rerun after removing duplicate manual-lead model calls. The full optional official-service HTTP flow passed before that small change; the changed manual-create behavior has its own direct-action regression, typecheck, lint and build coverage. Do not imply a later source change was part of an earlier end-to-end run.

## CI and review

Feature CI runs for each stacked PR. Earlier stacks through weekly reports passed migration-copy tests, regressions, typecheck and lint. The audit stack adds build and default-off HTTP smoke. Consult the exact PR head's checks rather than assuming an earlier successful run certifies a later commit.

All feature PRs remain drafts/unmerged on PR55. Migrations, flags, scheduler, secrets, ownership reconciliation and production rollout are review tasks, not executed by this implementation.
