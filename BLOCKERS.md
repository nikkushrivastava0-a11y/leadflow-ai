# LeadFlow AI — remaining external release blockers (2026-11-13 IST)

## Completed engineering

Actual local Next.js owner and public-form HTTP flows pass with official real Auth/JWT/PostgREST. The existing-PostgreSQL guard removes the need for a new Redis service. A default-disabled, test-key-only Razorpay backend and durable atomic test ledger are implemented. Exact atomic production cutover/recovery and real synthetic pg_dump/restore rehearsal are prepared.

## Production remains NO-GO

1. Seven current business owner mappings require explicit private provenance. Thirty-nine historical lead records require an exact privately approved quarantine manifest. No owner is guessed, reassigned or claimed from email equality; no real row was moved/deleted. The current aggregate baseline remains94 leads:39 unresolved and55 reviewable, not exposure-approved.
2. The actual production database has no owner_user_id/follow-up columns or reviewed owner policies and retains broad anon grants. Prepared SQL is not an applied migration.
3. A real encrypted production backup and successful disposable restore receipt are unavailable. The connected Supabase surface has no pg_dump export/database-password capability. Synthetic archives prove the procedure, not that customer data is backed up.
4. The browser reaches Supabase's normal sign-in page. No existing authenticated dashboard session or server secret was available. SUPABASE_SECRET_KEY and database backup credentials must be configured through secure account tooling, never pasted in chat. No privileged key was retrieved by SQL or fabricated.
5. Six preview-branch settings were configured: canonical public/callback origins, a fresh sensitive HMAC secret, LEAD_GUARD_PROVIDER=postgres, PUBLIC_ENQUIRIES_ENABLED=false and LEADFLOW_BILLING_MODE=disabled. No production environment was altered. The guard proposal and server key still need authorized hosted installation/configuration before intake can open.
6. Local actual HTTP does not certify hosted Auth redirects, email/PKCE delivery, browser event handlers/mobile behavior or actual provider gateway semantics.
7. Payment code now exists but actual Razorpay test credentials, webhook secret and server test catalogue are unavailable. Offline/provider fixtures and real local SQL tests are not actual Razorpay dashboard acceptance. No live mode, payment UI or real paid entitlement consumer is enabled.

## Concrete next inputs

Use docs/security-atomic-cutover.md and the empty private-input template: reviewed client→Auth UUID mappings/provenance, exact quarantine IDs/digests, actual backup/restore receipt, exact final source SHA and maintenance window. Do not commit those private values. Secure hosted sign-in/configuration and genuine test-provider acceptance are needed before a release decision. A merge alone cannot close these gates.

No paid plan, paid staging/API call, charge, subscription, new billable resource or customer message was enabled. No production migration, main merge/promotion or customer-data mutation occurred.
