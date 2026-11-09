# P0-05 — Tenant security review and staged release plan

**Status:** critical release blocker. Live database remains unchanged. This document is a proposal, **not** evidence of a secure production system.

## UPDATE — founder enabled RLS (2026-11-09, reverified)

**Current status overrides the historical observations immediately below.** The connected `leadflow-ai` project remains `ACTIVE_HEALTHY`. Both `public.clients` and `public.leads` now have **RLS ENABLED**. Supabase Security Advisor no longer reports the previous disabled-RLS ERRORs.

However, this is **not** a complete or verified tenant-security release:

- `clients` has **zero RLS policies**. With normal Supabase browser/session clients, the authenticated owner dashboard cannot read its own `clients.slug`, resulting in a missing-profile state.
- `leads` still has only two historic policies: `SELECT` and `INSERT` with `auth.uid() = user_id`. With no `UPDATE`/`DELETE` policy, owner edit/delete cannot succeed via ordinary user sessions. Public forms insert without `user_id`, so anonymous submission is blocked.
- Both `anon` and `authenticated` roles still have broad grants, including `TRUNCATE`. Read-only `has_table_privilege` checks returned **true** for `TRUNCATE` on both tables for both roles. PostgreSQL RLS does not govern `TRUNCATE`. This is a continuing privilege risk, even though the normal PostgREST row APIs do not directly expose a TRUNCATE endpoint.
- Existing data remains at **7 clients and 94 leads** in the read-only aggregate recheck; 43 leads have NULL `user_id`. These will not pass the current user-ID-based SELECT policy without an owner reconciliation plan.
- Advisor still reports `clients` as `rls_enabled_no_policy` (INFO) and leaked-password protection disabled (WARN).
- **No policy, grant, schema, customer record or production configuration was modified by the assistant.** The founder enabled RLS independently.

**Immediate priorities:** (1) review/restrict non-row-scoped grants, especially `TRUNCATE`, with an approved SQL change; (2) stage an Auth-linked owner policy and private reconciliation of legacy records; (3) ensure protected form submission is wired and tested; (4) run two-business authorized/anonymous smoke tests. **Do not run the below SQL proposal blindly:** it still aborts on unmatched business and unowned legacy records, and current source code is not ready for its privilege changes.

### Historical baseline — captured before the founder enabled RLS

## Live observations (2026-11-09, read-only; historical RLS-OFF snapshot)

Connected project: `leadflow-ai`, ref `pqzawjeggyxarwdkdynz`, `ACTIVE_HEALTHY`.

- 7 registered business rows, 94 lead rows, 14 Auth accounts.
- Both `public.clients` and `public.leads` have RLS disabled.
- The `anon` role currently has SELECT, INSERT, UPDATE, DELETE and additional table privileges on both tables. Browser-visible anon/publishable keys are **not secrets** and cannot enforce row ownership on their own.
- `leads` has two historic policies filtering `auth.uid()=user_id`, but with RLS disabled they do not run.
- 6 business owner emails match confirmed Auth users; one does not.
- 51 leads have no `client_slug`; 5 have a slug that is not in `clients`; 43 have NULL `user_id`; 33 reference a non-existent Auth user. **These categories overlap.**
- An additional ownership classification found 38 leads with neither a business slug owned by a confirmed Auth account nor a valid Auth user UUID. They must not be automatically reassigned.
- No existing public SQL functions were found. The project is holding real records; avoid writes or destructive testing on the production DB.

Supabase Security Advisor reports `rls_disabled_in_public` and `policy_exists_rls_disabled` as errors. An additional warning reports password-leak protection off.

## Stop-the-bleeding decision (human approval required)

Before the first real client demo or broader distribution, the founder must choose between two staged options.

**Option A: Emergency containment with downtime**

Immediately protect stored data at the cost of temporarily disabling business dashboard and public forms. This should be a deliberate reviewed operation on production, with a rollback plan and a verified copy/backup:

```sql
begin;
alter table public.clients enable row level security;
alter table public.leads enable row level security;
revoke all privileges on public.clients from anon, authenticated, public;
revoke all privileges on public.leads from anon, authenticated, public;
commit;
```

**DO NOT RUN THIS AUTOMATICALLY.** This intentionally denies client read/write access until replacement roles, policies and server-only form submission are deployed. Database bypass roles and privileged SQL Editor sessions are a separate security boundary.

**Option B: Staging-first, no customer interruption if possible**

Prepare the full migration in a nonproduction clone, repair ambiguous ownership there, prove two-tenant access controls, then schedule a short coordinated production cutover. Until then, consider temporarily pausing public lead intake/marketing and accepting no new real customer data. The exposure risk persists while the database remains unchanged.

## Proposed long-term model

1. Add immutable `clients.owner_user_id` referring to `auth.users.id`. Match existing owners by confirmed email only as a **one-time reviewed backfill**, not a permanent authorization check. One currently unmatched business is an explicit release blocker.
2. Make `clients` owner-readable under RLS. Do not grant public/anon SELECT on owner email, business profile data, or other private columns. Prevent direct business-owner reassignment.
3. Make leads readable/mutable only by their owning business. Legacy rows with no valid slug may be accessible through verified `user_id`; never let a conflicting slug or free-form user metadata transfer ownership.
4. Revoke all broad anon table grants, including `TRUNCATE`, `TRIGGER` and `REFERENCES`. Authenticated grants should be limited to read and required columns/operations.
5. Public forms must stop inserting directly as `anon` to `public.leads`: anyone can bypass a Next.js-only rate limiter by calling PostgREST with the browser key. Route external submissions through a narrowly scoped server action with a **server-only credential**, strict validation, real shared rate limiting, and database-verified business slug. Never send this credential to the browser. The service-role option must be separately code-reviewed and secret-managed.
6. Do not activate Stripe/Razorpay paid services without order ownership, server-side captured payment verification and audited entitlement.
7. Tenant RLS must be tested with two fabricated user accounts and no production customer data; the policy must also prevent anonymous SELECT, UPDATE, DELETE, TRUNCATE and table metadata modification.

## Why the proposal SQL cannot currently run

`security/proposals/p0-05-reviewed-rls.sql` contains a manual approval sentinel and preflight aborts if:

- any business does not resolve to a confirmed Auth identity;
- a lead has neither an identifiable owned business nor a valid Auth user;
- unexpected policies have appeared since the audit.

The current production data fails at least the first two gates. The SQL is deliberately **not** in `supabase/migrations/` and cannot be automatically applied on deploy. This is a review artefact only.

The founder must review the unmatched business and ambiguous leads in a **private owner-only interface**, verify ownership from trusted evidence, and explicitly approve the mapping. Do **not** post customer names, emails, phone numbers, JWTs or full record extracts in GitHub issues/PRs.

## Staging verification (mandatory before any production migration)

- Confirm the project and source branch, take a reviewed backup/snapshot, and verify rollback access.
- Create two nonproduction businesses with separate synthetic accounts; verify their Auth IDs and business slug associations.
- From **anon**: `SELECT`, `UPDATE`, `DELETE`, `TRUNCATE` against `clients` and `leads` must be denied; a public form must only use its protected server path.
- From **owner A**: SELECT/INSERT/UPDATE/DELETE own leads succeeds, reading or changing owner B's rows fails.
- From **owner B**: mirrored checks succeed only for B.
- Attempt to update `client_slug`, `user_id`, `owner_user_id`, score and sensitive fields directly: ownership mutation must be denied without a privileged audited workflow.
- Test legacy `user_id`-owned leads separately; do not require arbitrary slug replacement without evidence.
- Test public form validation, duplicate suppression, Redis-down fail-closed, success/failure feedback and cross-client isolation.
- Test profile provisioning after signup and after email confirmation, including a client that is not yet linked to an owner.
- Run Supabase security advisors again; expect no `rls_disabled_in_public` or `policy_exists_rls_disabled` errors.
- Verify the commercial app still works with the final merged code and the official Vercel preview; no production launch until functional tests pass.

## What I did not do

No table grants, RLS flags, schema rows, records, secrets, Auth users, hosting settings or prod deployments were modified. Only schema metadata, policy metadata and **aggregate counts** were read via connected Supabase tools.

## References

- [Supabase RLS guide](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Data API privileges](https://supabase.com/docs/guides/api/securing-your-api)
- [Supabase security linter](https://supabase.com/docs/guides/database/database-linter)
- Existing LeadFlow code: `src/app/dashboard/page.tsx`, `src/lib/actions.ts`, `src/app/form/[slug]/page.tsx`.
