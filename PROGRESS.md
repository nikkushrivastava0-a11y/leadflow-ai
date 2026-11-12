# LeadFlow AI — execution evidence, 2026-11-13 IST

## Source baseline

Candidate: `integration/customer-ready-candidate-20261113`, based on PR54 `c2752777a24a15b53f549bb3177f3367cd81e073`. Git ancestry confirms it includes PR53 `d7123dc` and PR49 `04d0afb`; no duplicate feature merges. Production main baseline remains `c39a0efacd537dbe3c0c56d2e16eaff1495f78c6`.

Historical PR54 Vercel preview `leadflow-96v6spl00-nikku-s-projects2.vercel.app` is READY; it is not this final candidate and is not proof of production readiness.

## Implemented

- Owner-scoped status/delete actions now match the dashboard's own null-slug legacy scope.
- Follow-up timestamp save/change/clear and UI; UTC storage, browser-local date input. No automatic reminders/messages.
- Score explanations/fallback are visible; public placeholder score explicitly unscored.
- Failed logout remains a visible failure; pending workspace has navigation/logout controls.
- Next16 proxy refresh/expiry redirects preserve auth cookies and no-store headers; unverified/error sessions cannot gain dashboard access.
- Public intake requires explicit `PUBLIC_ENQUIRIES_ENABLED=true` and a provisioned owner-linked business. Default is closed.
- Success query alone cannot claim a saved enquiry. A five-minute signed HttpOnly receipt, containing no contact details or record ID, is issued only after accepted database save.
- Checkout remains disabled with actual-handler offline regression tests.
- CI now runs all test files and real built-app HTTP smoke on the final candidate/main-targeting PR.

## Validation

Final integrated source: 64/64 offline/proposal tests passed. TypeScript, ESLint and diff checks passed. Production build and built-app smoke were run with fake configuration; final remote CI results are linked from the candidate PR. Built-app HTTP checks confirmed homepage/login, protected dashboard redirect, static form redirect, invalid slug 404, disabled intake, unsigned success rejection, PKCE error redirect and disabled checkout.

External boundaries are mocked in action/proxy tests. These checks do not establish real Auth/JWT, deployed CRM persistence, configured shared Redis availability or provider payment verification.

Fresh Supabase inspection was read-only, schema/aggregate only: 7 clients, 94 leads, 39 unresolved; all seven client emails match confirmed Auth accounts, no hardened owner policies/owner column. See docs/security-release-path.md for reviewed SQL and test evidence. No customer PII was exported.

## Exact SQL rehearsal

On free disposable PostgreSQL 17.11, the exact owner migration harness passed owner A/B CRUD restrictions, privilege restrictions and follow-up persistence/clearing. A separate fresh database passed exact reviewed-ID quarantine and rollback: 55 public +39 private rows conserved with full-row checksum checks, anon/authenticated/service-role quarantine reads denied, changed-data rollback rejected, and 94-row restore completed under restrictive access hold. The CI runs the original generic synthetic94 harness first and each exact proposal harness in its own fresh database. No production SQL was run.

## Real local Auth/JWT evidence

Official pinned Supabase Auth2.197.0 and PostgREST16.5 were run on loopback with PostgreSQL17.11 and synthetic identities. Actual signup/password login/user validation, signed JWT A/B isolation, anonymous/forged/expired rejection, own CRUD/status/follow-up/readback/clear, cross-owner write denial, refresh/logout and refresh denial passed. Exact39-row quarantine stayed inaccessible through the real API. Both local trust and separate SCRAM password configurations were verified. No SMTP, real provider credentials or hosted environment were used. CI now downloads checksum-pinned official archives and repeats this in a fresh database. See docs/security-local-auth-jwt.md. Hosted browser/public-form/platform acceptance is still blocked.

## Pending final evidence

Final source SHA, PR, CI and preview evidence are recorded in the candidate PR description and checked after publishing. See BLOCKERS.md for hard release gates. No production merge/promotion/migration or customer data mutation is authorized.


## Continued launch-blocker session

- Added existing PostgreSQL guard provider (same tenant/contact/duplicate contract), SECURITY INVOKER service-only RPC and private RLS state. Exact SQL/concurrent throttle/token/expiry/unknown-business tests passed locally; Redis is optional, no new service required.
- Added test-key-only, OFF-by-default payment checkout/verify/webhook with official test API adapter, server test catalogue, stored-order signatures, captured amount/currency/refund checks, raw-body webhook HMAC, durable order/event/test-entitlement ledger, concurrent replay/throttle safety and irreversible refund/dispute tombstones. No provider call/real payment made. Original checkout/UI remain disabled.
- Added exact production-specific atomic owner/quarantine/RLS transaction and restrictive recovery, private manifest/snapshot/receipt gates. Actual synthetic pg_dump archive restored and full-row/schema/ACL hashes matched. Real production backup is unavailable, not claimed.
- Actual Next production-build HTTP flow passed locally with official Auth/PostgREST, standard SSR cookies, expiry/refresh, owner actions, follow-ups, search/pagination, CSRF, signup-pending and logout.
- Actual native multipart public action passed via a narrow fixture TLS CA/SAN and generated fake writer key: real PostgreSQL guard+insert, correct owner dashboard, receipt, duplicate/honeypot/invalid/unknown denial and failed-write reservation release/retry. No production URL/TLS validation was weakened. Browser/mobile and hosted provider semantics remain unverified.
- Preview branch configuration verified by key metadata only: private sensitive hash, postgres provider, canonical URLs, intake=false, billing=disabled. Production variables untouched.
- Current integrated offline/proposal tests84/84 pass; final combined CI and preview evidence are recorded in PR55 after publishing. CI also runs exact SQL/concurrency/backup/Next owner+public rehearsals in separate synthetic databases.
- Hosted configuration is blocked on Supabase dashboard sign-in/server key; production cutover on private manifests and real backup/restore evidence; provider activation on genuine test credentials/acceptance. See BLOCKERS.md.


CI caught two runner compatibility failures in the expanded candidate: the historical dependency-free Redis job now loaded an optional Supabase dependency, and the billing shell harness assumed ripgrep was installed. The provider import is now lazy and the shell count uses portable awk. Redis tests passed in a new directory with no node_modules, and the exact billing/atomic rehearsals passed again. The atomic late-failure injection was also corrected to preserve SQL dollar quoting, and rejection assertions now inspect ERROR lines rather than echoed statements. Final remote CI remains the release evidence in PR55.
