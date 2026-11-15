# Release environment gate — Phase 1

No merge or production action is authorized by this document.

`vercel.json` pins `npm run build`; its `prebuild` runs the configuration-only
release preflight. `npm start` runs the same preflight. Server instrumentation
also refuses invalid production/preview/staging configuration, including direct
Next startup. Only variable names and error codes are printed, never values.
Node 24 is required for the preflight TypeScript import.

## Required before production merge (names only)

- `LEADFLOW_ENV` (production)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (publishable or legacy anon JWT, never service role)
- `AUTH_CALLBACK_ORIGIN` (HTTPS origin)

Set `PUBLIC_ENQUIRIES_ENABLED`, `LEADFLOW_AUTOMATION_ENABLED`,
`LEADFLOW_EMAIL_ENABLED`, `LEADFLOW_FOLLOWUPS_ENABLED`,
`LEADFLOW_WEEKLY_REPORTS_ENABLED`, `LEADFLOW_ONBOARDING_ENABLED`,
`LEADFLOW_ANALYTICS_ENABLED`, `LEADFLOW_PRIVACY_NOTICE_ENABLED`,
`LEADFLOW_PRIVACY_TOOLS_ENABLED`, `LEADFLOW_TRIALS_ENABLED`,
`LEADFLOW_TEST_CHECKOUT_UI` explicitly false initially.
Set `LEADFLOW_BILLING_MODE` disabled. Never set `LEADFLOW_SYNTHETIC_ONLY` on Vercel.

## Required only when enabling the corresponding feature

| Feature | Variable names |
| --- | --- |
| Public intake | `SUPABASE_SECRET_KEY`, `LEADFLOW_PUBLIC_ORIGIN`, `LEAD_GUARD_HASH_SECRET`, `LEAD_GUARD_PROVIDER` |
| Redis guard instead of Postgres | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` |
| Automation | `SUPABASE_SECRET_KEY`, `CRON_SECRET` |
| Onboarding or privacy tools | `SUPABASE_SECRET_KEY` |
| Privacy notice | `PRIVACY_CONTACT_EMAIL` |
| Email | `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `LEADFLOW_EMAIL_MODE` |
| Gemini | `GEMINI_API_KEY`, `GEMINI_MODEL` |
| Test billing | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `LEADFLOW_TEST_PLAN_CATALOGUE` |
| Preview/staging | `LEADFLOW_ENV`, `LEADFLOW_STAGING_PROJECT_REF` |

Vercel supplies `VERCEL` and `VERCEL_ENV`. Preview must point to a separate
staging project and use sandbox email. No live billing mode is accepted.

## Limits of this check

Configuration checks prove presence and local syntax only. They cannot prove
that a key is valid, the database schema is installed, callbacks are allowed,
provider accounts work, or staging acceptance passed. Those remain unverified
until a later phase supplies proof. No external requests run during preflight.

PRs #55–#75 remain reference PRs; the release PR targets main directly.
The release branch contains each original head by Git ancestry. Do not merge
individual reference PRs as an additional release procedure.
