# Release blockers — 2026-11-13 IST

## Production remains NO-GO

1. Fresh read-only audit: `clients.owner_user_id` is absent, hardened owner policies are absent, broad anon grants remain. RLS being enabled does not prove isolation. Current database is incompatible with candidate owner-scope lookups.
2. There are 94 leads, including 39 unresolved (5 unknown-business-slug +34 unprovisioned legacy). Another 55 are reviewable, not ownership-approved. No assignments or records were changed. All 7 current client emails uniquely match confirmed Auth accounts; the prior unmatched-client blocker is no longer current, but email matching alone is not approval.
3. No existing authorized synthetic Supabase Auth account credentials/free test environment were available. The original SQL harness models auth.uid(); a separate official local Auth/PostgREST harness now passes real signed-JWT isolation, expiry and session refresh/logout checks. Hosted project settings and actual deployed Next.js session/customer flow remain unverified. Do not test destructive cross-account operations on customer data or create accounts that send emails under this scope.
4. Vercel environment key-name inventory only (values not decrypted) lacks `SUPABASE_SECRET_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `LEAD_GUARD_HASH_SECRET`, `LEADFLOW_PUBLIC_ORIGIN`, `AUTH_CALLBACK_ORIGIN` and the new `PUBLIC_ENQUIRIES_ENABLED` gate. No paid Redis/staging/provider was created. Intake stays disabled. A free existing limiter must be available or a separately reviewed free alternative is needed; creating a billable service is forbidden.
5. No automated business provisioning: pilot workspaces need privately verified manual provisioning. Do not claim a workspace from self-supplied email/slug/metadata.
6. Follow-ups need the nullable column and narrow grant bundled in the owner-RLS proposal. No migration was applied.
7. Billing intentionally returns HTTP503. An order ledger, captured amount/currency and owner verification, idempotent webhooks, durable entitlements and real provider test-mode acceptance are not implemented/verified. A signature helper alone cannot unblock billing.

## Approval boundary

No production approval is requested yet: real JWT acceptance, private manifest review, a verified backup/restore plan and final release review must precede a concrete production approval request. Do not approve a blind migration or infer ownership.

## Cost

No paid plan, staging project, paid API call, charge, subscription, billable resource or outbound customer message was enabled by this work.
