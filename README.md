# LeadFlow AI

A lead and enquiry workspace for small Indian businesses: guarded public intake, owner-scoped CRM, qualification, transactional emails, follow-up drafts, weekly reporting and a Razorpay **test-only** billing sandbox.

**Release status:** this work is a review candidate stacked on unmerged [PR #55](https://github.com/nikkushrivastava0-a11y/leadflow-ai/pull/55). New automation, email, duplicate merge and checkout remain off by default. Source implementation and synthetic tests do not certify a customer-ready production release. No live payment support is enabled.

## Stack and architecture

Next.js 16 / React 19 / TypeScript, Supabase Auth + SSR + PostgreSQL, Tailwind 4 and shadcn/Radix. Provider integrations use Gemini, Resend and Razorpay. Node 24 is used by regression CI; Node 20.9+ is the Next.js minimum, but native TypeScript test execution here requires a compatible recent Node release.

| Boundary | Responsibility |
| --- | --- |
| `src/proxy.ts`, `src/lib/supabase` | Verified Auth session, SSR cookies and refresh; no tenant decisions from user-editable metadata |
| `src/lib/server/owner-scope.ts` | Maps confirmed Auth UUID to the provisioned business |
| `src/lib/actions.ts` | Validated owner CRM mutations under RLS |
| `src/app/form/[slug]` | Validated public Server Action, honeypot, shared atomic guard, server-only writer and signed save receipt |
| `src/lib/qualification.ts` | Rules first; optional Gemini with strict JSON validation and safe fallback |
| `src/lib/server/automation` | Leased jobs, qualification, immutable Resend outbox, reminder and report processors |
| `src/lib/server/billing` | Test-only order catalogue, capture/signature verification, durable replay/revocation ledger and access predicates |
| `supabase/migrations`, `supabase/rollbacks` | Review-gated additive feature migrations and reverse-order disposable-staging teardown |
| `security/proposals` | PR55 ownership reconciliation, restrictive release and recovery proposals; never automatic production setup |

### Data and RLS

`clients.owner_user_id` is the ownership trust root; `leads.client_slug` selects business scope. Reviewed legacy null-slug leads use owner UUID fallback. Anonymous table access is denied; public submissions pass through the guarded server writer. Normal CRM actions use cookie-bound owner clients, not elevated credentials.

Every new table enables RLS and revokes anonymous access:

| Tables | App access |
| --- | --- |
| `lead_qualifications`, `lead_activity`, `followup_drafts`, `weekly_owner_reports` | Owner SELECT through verified business mapping; writes reserved for worker/private triggers |
| `automation_settings` | Owner reads and saves only their business preferences |
| `automation_jobs`, `email_deliveries`, `billing_test_events`, `billing_test_checkout_attempts`, `billing_test_failures` | No browser/owner direct access; server worker/ledger only |
| `billing_test_orders`, `billing_test_entitlements` | Owner SELECT under RLS; server-only mutation |

Private trigger functions enqueue jobs and append audit entries atomically with lead writes. They have fixed search paths and no app-role EXECUTE grants. Public worker/billing RPCs are SECURITY INVOKER and executable only by `service_role`. `SUPABASE_SECRET_KEY` bypasses RLS: keep it server-only and use it only through these narrow paths.

## Pilot candidate additions

[Current pilot scope and release gates](docs/PILOT_CANDIDATE.md) documents health/startup isolation, confirmed-owner onboarding and embed tags, source analytics/CSV, Hindi/Hinglish forms, consent/privacy/data tools, pricing/trials and real Playwright CI. These additions remain review candidates; hosted staging creation and production backup verification are blocked. Do not mistake synthetic browser success for hosted-provider acceptance.

## Local setup

```bash
npm ci
cp .env.example .env.local
npm run check:staging
npm run dev
```

For Auth/CRM, populate the public Supabase URL/API key and use an **isolated development project** with reviewed owner mappings/schema. A confirmed signup alone does not provision a business. Open `http://localhost:3000`; missing business setup correctly shows access pending. Do not link the CLI to production or run `supabase db push` as a shortcut.

Use Node 24 for the preflight and regression scripts. `check:staging` reads `.env.local` if present, checks configuration locally, and prints only variable names/error codes. It exits nonzero for invalid staging setup, a production target, or a hosted synthetic-test bypass. It performs no database or provider requests; `configured` is not a hosted acceptance result. Preview/staging startup now refuses every validation error, including missing enabled-worker/mail credentials.

The 16 November inventory found both active free Supabase slots occupied by LeadFlow and DeadEnd; creating a staging project was rejected for that limit. Continue the synthetic local/CI checks below. A hosted stage needs a separately selected free slot; do not pause another project or upgrade a plan to bypass the limit.

Feature SQL assumes the reviewed PR55 owner/RLS cutover exists. It is **not** an empty-database bootstrap. Schema-only synthetic setup and tests are described below. Rehearse against an approved restored schema before any separately approved hosted migration. Migration 05 refuses an existing test ledger so an operator must review prior proposal application rather than overwrite it.

## Environment variables

Copy names from [.env.example](.env.example). Only public Supabase API configuration belongs in browser variables. All keys below without `NEXT_PUBLIC_` are server-only.

| Variable | Purpose / safe default |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase URL and public publishable/legacy anon API key; never an elevated key |
| `SUPABASE_SECRET_KEY` | Modern `sb_secret_…` server writer/worker credential |
| `LEADFLOW_PUBLIC_ORIGIN` | Approved HTTPS origin for the displayed enquiry URL |
| `AUTH_CALLBACK_ORIGIN` | Approved HTTPS Auth callback origin; also configure Supabase Site URL and exact `/auth/callback` redirect URL |
| `PUBLIC_ENQUIRIES_ENABLED` | `false` until ownership, backup, RLS and hosted intake gates pass |
| `LEAD_GUARD_PROVIDER`, `LEAD_GUARD_HASH_SECRET` | Prefer existing `postgres` guard; random secret of 32+ characters |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Optional alternative Redis guard; no new service required for PostgreSQL mode |
| `LEADFLOW_DUPLICATE_MERGE_ENABLED` | `false`; enable only after merge migration/acceptance |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | Optional model API key and explicitly selected available model; leave blank for rules |
| `CRON_SECRET` | Random 32+ character bearer secret; no secret in a URL query |
| `LEADFLOW_AUTOMATION_ENABLED` | Master worker switch, `false` |
| `LEADFLOW_EMAIL_ENABLED` | Transactional mail switch, `false` |
| `LEADFLOW_FOLLOWUPS_ENABLED` | Owner reminder switch, `false` |
| `LEADFLOW_WEEKLY_REPORTS_ENABLED` | Weekly report switch, `false` |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | Resend server credential and verified bare sender address |
| `LEADFLOW_BILLING_MODE` | `disabled`, or explicitly `razorpay-test`; live keys/modes rejected |
| `LEADFLOW_TEST_CHECKOUT_UI` | `false`; explicit test UI opt-in |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | Test key ID and separate strong server/API/webhook secrets |
| `LEADFLOW_TEST_PLAN_CATALOGUE` | Server JSON catalogue: integer amount in paise, `INR`, finite `durationDays` |

Environment changes on Vercel require a new reviewed deployment. Do not assume changing a variable changes a previously built route or deployed browser bundle.

## Owner and API routes

| Route | Behavior |
| --- | --- |
| `/dashboard` | Owner leads, status, follow-up dates, search and pagination |
| `/dashboard/activity` | Newest 50 events, 20 qualifications, 20 private reply drafts, 8 reports |
| `/dashboard/settings` | Business voice/language and reminder/report preferences |
| `/dashboard/billing`, `/dashboard/pro` | Explicitly gated test checkout and request-time test entitlement checks |
| `/form/[slug]` | Public enquiry form; unavailable until approved intake configuration |
| `GET /api/cron/automation` | `Authorization: Bearer CRON_SECRET`; schedules enabled jobs and processes two leased jobs per invocation |
| `POST /api/billing/checkout` | Verified owner; server catalogue selects order price |
| `POST /api/billing/verify` | Stored order ownership + HMAC + authoritative captured/refund-free provider payment |
| `POST /api/billing/webhook` | Raw-body HMAC and durable event replay handling |
| `GET /api/billing/access` | Non-cached test access status; no real paid access |
| `POST /api/checkout` | Historical endpoint remains disabled |

A score is a heuristic, not a buying prediction. Gemini receives local allowlisted signals, never names, phone/email values or raw notes. Provider/validation failures save rule fallback and an activity entry. Existing leads are not automatically backfilled.

Follow-ups occur for still-`new` leads at 24h, 3d and 7d; mark leads contacted when answered. Inbox replies are not integrated. Drafts follow friendly/professional/concise voice and English/Hinglish preferences. They are stored and emailed to the owner for review, **never automatically sent to customers**. Repeat enquiry merges preserve CRM fields and suppress new notification jobs.

## Validation

```bash
node --test tests/*.test.ts tests/*.test.mjs security/tests/*.test.mjs
npx tsc --noEmit
npm run lint
npm run build
node scripts/http-smoke.mjs
```

Database checks require PostgreSQL 17 utilities and an **empty disposable loopback database**. They create a synthetic owner/RLS baseline, use actual `pg_dump`/`pg_restore` to make the staging copy, apply all feature migrations, test tenant isolation/concurrency/rollback and reapply. They never accept hosted targets or customer data.

```bash
# Create an empty local database first, with your local PostgreSQL role.
export PGHOST=127.0.0.1 PGPORT=5432 PGUSER=postgres
export PGDATABASE=leadflow_feature_staging LEADFLOW_SYNTHETIC_ONLY=YES
node security/tests/features-staging.mjs
```

[Feature CI](.github/workflows/feature-staging.yml) repeats migration-copy tests, regressions, typecheck, lint, build and default-off HTTP checks. The optional official Auth/PostgREST fixture supports `LEADFLOW_NEXT_FLOW=YES LEADFLOW_PUBLIC_NEXT_FLOW=YES LEADFLOW_FEATURE_FLOW=YES`; see [verification evidence](docs/FEATURE_VERIFICATION.md) for pinned binaries, configuration and the distinction between HTTP and browser checks.

## Release, costs and rollback

Review the PRs in order, starting with #55. [Operations guide](docs/FEATURE_OPERATIONS.md) covers backup/restore, scheduler/Vault setup, hosted acceptance, observation and emergency disable. Each feature has its own risk, illustrative monthly cost, manual setup and rollback document:

1. [Qualification](docs/features/01_qualification.md)
2. [Notifications](docs/features/02_notifications.md)
3. [Follow-ups](docs/features/03_followups.md)
4. [Spam and duplicates](docs/features/04_spam.md)
5. [Test billing](docs/features/05_test_billing.md)
6. [Weekly reports](docs/features/06_weekly_report.md)
7. [Status audit](docs/features/07_audit.md)
8. [Setup documentation](docs/features/08_readme.md)

No paid service, scheduler, provider email or payment is activated by these code changes. At 1,000 new enquiries/month, budget up to 2,000 confirmation/alert emails + 3,000 reminders + 40–50 reports for ten businesses, and up to 4,000 optional model calls. Free quotas may not cover this combined workload. Rule-only qualification costs no model usage; existing-database features need no additional service. Do not add the overlapping per-feature email estimates together as separate subscriptions; inspect actual combined volume and obtain approval before paid upgrades.

Rollback normally means turning feature flags off and reverting the application, preserving queue/outbox/ledger/audit history. Reverse SQL is destructive disposable-staging teardown, not a production recovery substitute. Never remove replay/revocation history, restore broad anonymous grants, or disable RLS to recover a feature.

## Screenshots

Placeholders awaiting verified captures (use synthetic data; never expose secrets):

| Capture | Status |
| --- | --- |
| Owner dashboard, desktop and narrow viewport | Placeholder |
| Qualification and private reply drafts | Placeholder |
| Preferences and weekly report | Placeholder |
| Razorpay test checkout, verified success, failure and expiry | Placeholder |
| Two-owner activity isolation | Placeholder |

Hosted Auth redirects, actual Resend delivery, genuine Razorpay test checkout/webhook delivery and browser/mobile interaction are release acceptance checks, not inferred from offline tests.
