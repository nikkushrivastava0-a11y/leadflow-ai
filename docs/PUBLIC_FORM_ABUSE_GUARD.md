# Public enquiry abuse guard — draft integration

This code is a P0 protection for anonymous enquiry forms. **It is not activated on production.** The PR is intentionally stacked on validation PR #23 (itself stacked on failure feedback PR #17), and requires shared Redis credentials and real staging database/RLS tests before merge.

## Why not use in-memory rate limiting?

Vercel/Next.js serverless functions can run in different processes and regions. A local Map/setTimeout counter only protects one process and can be bypassed by concurrent workers or restarts. This implementation uses an atomic Redis Lua `EVAL` request over HTTPS. See official Upstash Redis REST / Lua docs:
- https://upstash.com/docs/redis/features/restapi
- https://upstash.com/blog/lua-scripting-on-upstash-redis-atomic-operations-over-http

## Safeguards in the draft PR

- Honeypot input named `company_website`, invisible to users, rejected if filled.
- One global hourly counter per business slug: **60** attempts/hour (configuration is currently hard-coded to avoid introducing unvalidated environment-controlled thresholds).
- One hourly counter per contact (business + email + phone): **4** attempts/hour.
- One duplicate reservation per contact + business + name: **90 seconds while the DB insert is pending**, followed by **10 minutes of suppression after successful DB insert**.
- A failed DB write releases its reservation (compare-and-delete), allowing legitimate retries; failed attempts still count against hourly budgets.
- Keys are HMAC pseudonyms of the business/contact fingerprint, using a server-only secret. **Neither full name nor email/phone values are stored in Redis keys or logged.**
- Missing credentials, non-HTTPS URL, API failure or invalid Redis response **fail closed** (visitor sees an error; no DB insert), not silently bypassed.
- Completed DB insert is reported as success even if the Redis confirmation call fails; the code logs that deduplication state was not confirmed.

## Required server-only environment variables

Add these only in reviewed server-side/staging environment settings, **not in source, issues, pull requests, or NEXT_PUBLIC_ variables**:

- `UPSTASH_REDIS_REST_URL` — HTTPS Redis REST endpoint ending in `.upstash.io`.
- `UPSTASH_REDIS_REST_TOKEN` — secret Redis write-capable REST token.
- `LEAD_GUARD_HASH_SECRET` — 32+ character secret pepper for hashed lookup keys. Use a cryptographically strong unique value generated and stored securely.

Do not expose these values in any browser response. Creating a managed Redis service, accepting terms/costs and configuring secrets all require explicit founder approval.

## What is not guaranteed

- This is not a database-level unique constraint or exactly-once transaction; rare crashes or Redis outages after DB success could permit duplicates. True cross-system exactly-once processing requires a durable database idempotency key and a unique index / transaction, which depends on the currently inaccessible Supabase project.
- A malicious sender can vary their contact details to evade per-contact limits. The per-business limit caps volume but might also constrain a legitimate burst of enquiries.
- This is not a substitute for CAPTCHA/WAF protection, consent/privacy notices, server-side validation, or Supabase RLS.
- Redis keys are pseudonymous data, not necessarily fully anonymous, and may still fall within applicable personal-data handling requirements.

## Test and release plan

1. Review and merge parent #17 and #23 only after an independent staging Supabase RLS test. Do **not** merge this stacked PR separately onto main.
2. Run synthetic unit tests in GitHub Actions; these mock Redis and do not incur service charges.
3. Provision a permitted, budget-reviewed shared Redis instance and add the three secrets in staging only.
4. In staging, test 2 separate business slugs and 2 separate contacts; confirm normal submission, duplicate rejection, rate limit, and retry after failed DB insert.
5. Kill Redis access in staging; confirm the form displays a clear unavailable state and does not create a lead.
6. Verify real database state for duplicate handling. Confirm captured lead appears only to the correct business.
7. Review data retention, operational cost, status errors and support fallback; then consider controlled production release.

**The current code is fail-closed until credentials are configured. Do not merge before staging is ready.**
