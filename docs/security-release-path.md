# Security release path — candidate review, not production authorization

Last verification: 2026-11-12 UTC / 2026-11-13 IST. Production was queried read-only through the connected Supabase account; no DDL, row updates, reassignment, deletion or quarantine was performed. Only aggregate counts and schema metadata were retrieved.

## Fresh production evidence

| Check | Observed |
| --- | --- |
| Clients / leads | 7 / 94 |
| Unmatched or non-unique confirmed Auth email candidates | 0 |
| Duplicate owner email groups | 0 |
| RLS enabled | Both clients and leads |
| `clients.owner_user_id` | Missing |
| Five reviewed owner policies | 0 installed |
| Existing policies | Two older lead SELECT/INSERT policies with public role |
| Broad anon table/column privileges | Present |
| Ownership preflight / hardened schema | BLOCKED / BLOCKED |
| Unknown non-null business slug | 5 leads |
| Legacy lead without provisioned owner | 34 leads |
| Reviewable valid business slug / confirmed legacy | 38 / 17 leads |
| `next_follow_up_at` | Missing |

All 7 email candidates now have a unique confirmed Auth match, so the old “one unmatched client” observation is stale. A matching email is a candidate for private review, not consent to claim a business. All 39 flagged leads remain unresolved; the other 55 are reviewable, not approved for exposure. Contact similarity never proves ownership.

## Exact review artifacts

- `security/proposals/p0-05-reviewed-rls.sql`: existing reviewed owner migration from the security branch, now included in the integrated candidate. It retains aborts on ambiguous ownership and unexpected policies; adds the nullable follow-up column and narrow follow-up UPDATE grant. It cannot run without its explicit staging sentinel. Its email backfill is for a separately reviewed one-time migration, never runtime authorization or self-serve business claiming.
- `security/proposals/p0-05-readonly-release-gate.sql`: aggregate-only ownership/schema check. Both gates must pass before release consideration.
- `security/proposals/p0-05e-readonly-quarantine-cohorts.sql`: current read-only cohort assessment.
- `security/proposals/p0-05-private-lead-reconciliation-queue.sql`: PRIVATE admin tool returning IDs for human review; never publish its output, use in frontend, CI or browser logs.
- `security/proposals/p0-05h-staging-quarantine.sql`: exact staging-only, separately gated transfer proposal. Requires a private temporary reviewed ID manifest and explicit expected count; refuses missing/substituted IDs, existing quarantine schema, inbound lead FKs and custom triggers. It moves full rows without changing ownership into a new unexposed, RLS-enabled schema with no normal API grants. Source + quarantine counts and full-row checksums must match.
- `security/proposals/p0-05h-staging-quarantine-rollback.sql`: exact staging recovery rehearsal. Refuses ID collisions or any mismatch with the original full-row snapshot. Adds a restrictive deny policy before restore, retains the private recovery copy and never restores broad privileges. This intentionally leaves CRM unavailable until a new reviewed release clears the hold.

These proposals have no application/CI auto-migration hook. They are NOT production migrations and NOT permission to execute them against production.

## Staging rehearsal and impact

Use an existing authorized free disposable environment. No paid Supabase branch is needed. Apply the additive nullable follow-up column before quarantine if rehearsing the whole sequence so public/private table shapes remain identical; the combined RLS proposal tolerates the column already existing.

1. Privately review source provenance and Auth/business-owner evidence. Capture approved mappings in the restricted operational record; do not commit customer IDs, emails, slugs or manifests.
2. Take an encrypted, restorable schema/data/ACL/policy backup using existing free facilities. Record timestamp, row counts and checksum. Test restore into a disposable database. Do not assume a provider backup exists on a free plan.
3. Pause writes and prevent public/customer access to the rehearsal target. Verify `leadflow_quarantine` is absent and will not be in Data API exposed schemas. Inspect dependencies and custom triggers before transfer.
4. Create the private TEMP ID manifest in the same admin session. Populate only IDs whose quarantine classification and provenance were reviewed; the transfer script checks exact current cohort equality. Set the explicit staging settings described in the SQL, then rehearse the quarantine transfer.
5. Run the reviewed RLS proposal against the remaining approved exposure set after privately approving every client mapping. Quarantine alone does not approve the 55 remaining rows. The full migration preflight remains intact.
6. Verify with real Supabase Auth JWTs for two authorized test businesses: own read/create/status/follow-up/delete; other owner denied; anonymous Data API denied; quarantine denied to anon, authenticated and the guarded service path. Test the actual application's guarded public enquiry flow and existing free Redis setup.
7. Rehearse recovery with writes paused. A full-row checksum mismatch must abort; preserve newer records and review the delta instead of overwriting. Keep deny policies and normal API access closed throughout recovery.
8. Rerun read-only gate and provider security advisors. Review tested candidate, backup evidence, timing, data impact and production-specific migration transaction before asking for production approval.

**Expected impact if separately approved later:** 39 rows become inaccessible to all ordinary business accounts while remaining intact in a restricted review area; the other 55 remain subject to verified owner policies. Counts must be rechecked at execution time rather than hard-coded. No owner is inferred or reassigned by quarantine. Old anonymous Data API access stops; public enquiries require the guarded server writer. Billing stays disabled.

The two staging SQL scripts remain separate rehearsal artifacts. The later `production-atomic-cutover.sql` proposal now combines transfer, explicit privately approved UUID owner mappings and RLS/grant activation in one production-specific review transaction; see `docs/security-atomic-cutover.md`. It requires real backup/restore evidence and separate approval. Do not ship a gap between the older staging scripts or merely rename their sentinel to “production”.

## Business provisioning runbook

Self-serve signup is Auth creation, not business ownership. The hardened schema intentionally grants customers no client INSERT/UPDATE/DELETE. For the initial pilot, an authorized administrator must:

1. Verify the signed-in test/customer identity and business owner's explicit request through existing onboarding evidence. Resolve conflicts privately; never use user-editable metadata or matching contact data as proof.
2. Approve a unique slug and one Auth user UUID per workspace. Reject an existing claimed slug or an owner already mapped elsewhere. Verify the Auth email is confirmed without logging its address.
3. Under a separately approved privileged transaction, insert a new client with that explicit `owner_user_id` and required business profile; do not alter existing client ownership as a shortcut. No general provisioning endpoint or service secret is exposed to the browser.
4. Validate that account's normal-session dashboard and public enquiry link using synthetic data first. Record only completion/evidence, not customer details, in public tracking.

No real business was provisioned in this session. Until approved schema and provisioning exist, a new confirmed signup must receive a truthful “workspace not provisioned” state rather than another business's data or a fake empty success.

## Verification and remaining blockers

Executed locally on free disposable PostgreSQL 17.11 downloaded from signed Debian snapshot repositories; no system service or paid resource was created:

- Exact owner migration harness: review sentinel, unmatched/duplicate identities, unresolved legacy rows, orphan slugs, conflicting owners, extra policies/grants, owner CRUD and cross-owner denial passed.
- Follow-up date persistence and clearing passed for owner A; owner B could not clear A's follow-up.
- Exact 94-row quarantine proposal: missing approval, incomplete/substituted manifest rejection; 55 + 39 conservation; full-row checksum preservation; actual owner migration; anon/authenticated/service_role quarantine read denial passed.
- Exact rollback: detects changed source rows and aborts without partial restoration; unchanged snapshot restores all 94 while retaining recovery copy and denying normal owner access with a restrictive hold.

These are PostgreSQL authorization and proposal tests with synthetic Auth functions. They are not real Supabase JWT, platform configuration or customer journey verification.

Production remains blocked by unresolved records/private owner approval, unapplied owner schema/grants, unverified hosted Auth/API test accounts, unverified guarded-form environment/Redis, and absent production approval. A later local official Auth/PostgREST rehearsal now verifies real signed JWT authorization against disposable data; see `docs/security-local-auth-jwt.md`. This narrows the authentication test gap but does not verify hosted settings or the deployed application. The smallest next input is access to an existing authorized free disposable Supabase environment and two verified test identities (provided through secure credentials tooling), plus private provenance decisions for the 39 unresolved rows. Do not ask for passwords, service keys or real lead details in chat.
