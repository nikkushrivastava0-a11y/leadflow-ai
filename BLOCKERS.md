# LeadFlow AI — release blockers, 16 November 2026 IST

## Current release state (supersedes historical notes below)

PRs #55–#73 are open drafts. Exact #73 head `b7fc5a19039555ba75acef4e7f9b02d09a47db0f` has successful [feature/regression CI](https://github.com/nikkushrivastava0-a11y/leadflow-ai/actions/runs/43750426381) and [two synthetic Chromium journeys](https://github.com/nikkushrivastava0-a11y/leadflow-ai/actions/runs/43750426358). The earlier browser-blocked handoff is superseded for synthetic local/CI testing only.

Fresh project inventory and a new staging creation attempt identified the exact hosted blocker: the account owner has reached the **two active free project limit across organizations** (LeadFlow and DeadEnd). No stage was created, no existing project was paused, and no paid fallback was requested. Continue disposable local/CI testing; hosted acceptance requires an explicitly selected free slot or separately supplied isolated free environment. Do not repurpose unidentified inactive projects or pause DeadEnd during its hackathon.

Vercel variable metadata still shows DB/provider settings shared with generic previews. Original #55 branch overrides do not apply to later release branches. No secrets were decrypted or settings changed. Configure isolated preview-only values before deployment, and keep the startup target guard enabled.

Remaining gates:

1. Isolated free hosted staging, reviewed schema/server writer, exact preview/Auth redirect URLs and exact deployed commit. Run `npm run check:staging` first; it validates configuration locally, without DB/provider requests. All staging validation issues now refuse startup.
2. Privately reviewed ownership/historical-record treatment. Old 94/39/55 totals below are historical audit evidence, **not a fresh inventory**. Test/friend accounts do not authorize guessed mappings or deleting/moving rows.
3. Separate authorization for any real production backup/export, then encrypted backup and successful isolated restore evidence. Synthetic backup success does not satisfy this gate. No passwords/keys/private manifests in chat or git.
4. Actual hosted Auth login/redirect/refresh/logout and two-owner preview/browser acceptance. Local Chromium does not certify hosted Auth or physical-phone behavior.
5. Controlled Gemini, Resend virtual-recipient and Razorpay TEST acceptance. No real customer message/payment; flags stay off until acceptance and usage stays within free allowances.
6. Review exact PR diffs, migration/maintenance and recovery proposal before requesting production approval. Generic continuation does not authorize production data changes.

Per-feature risks/costs/rollback/setup: `docs/FEATURE_OPERATIONS.md`, `docs/PILOT_CANDIDATE.md`, `docs/features/`. This continuation performed no production data read/export/mutation, production configuration writes, main merge, deployment/promotion, paid-plan activation or live provider operation.

## Historical blockers — 13 November (not current observations)

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
