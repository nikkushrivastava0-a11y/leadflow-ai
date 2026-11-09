# P0 — Consolidated LeadFlow backend integration

**Status: DRAFT ONLY. This is a code integration branch; it is NOT a production release.**

## Why a consolidation branch

The previous work was split across independent draft PRs: public form errors/validation (#17, #23), shared abuse guard (#30), server-only form writer (#41), manual CRM tenant consistency (#14), status editing (#19), safe AI scoring (#29), truthful signup (#47), callback host safety (#46), and billing pause (#15). Shipping these independently, out of order, would leave mismatched server actions, UI and RLS.

This draft branch **starts from PR #41** (including #17/#23/#30) and integrates the remaining core backend pieces in one reviewable dependency chain. It does not merge those PRs or change `main`.

## Working source-level flow (after required staging DB release)

1. Owner signs up and verifies email; Auth session isn't confused with provisioned business membership. PKCE callback validates exchange and redirects to a trusted origin.
2. All owner CRM actions call `resolveOwnerScope()`. It validates the server-side Auth user and reads `clients.slug` where `clients.owner_user_id = auth.uid()` through the normal Supabase SSR client. It **never falls back to user-editable metadata or email-to-business inference**. No service-role credential is used for owner CRM.
3. Owner dashboard queries matching `client_slug` rows plus legacy rows **only if client_slug is NULL and user_id equals the verified owner**. RLS must independently enforce tenant isolation.
4. Manual lead writes validate names, emails/phones, source and notes; the server derives owner ID + slug and controlled statuses. The scoring request sends only boolean intent signals, not contact PII or raw notes. Mutation success is confirmed with the returned row ID.
5. Status editing and deletion filter by the authenticated business slug. Deletion requires human confirmation and a database row returned with the matching ID; a zero-row RLS response is never success.
6. Anonymous form validates input and slug, uses shared atomic Redis attempt/dedupe guard, then a server-only Supabase secret to check an exact business slug and insert fixed permitted fields. It **fails closed** without approved Redis/secret configuration.
7. Billing CTA is disabled and the checkout POST returns **503**. No new Razorpay order/paid entitlement can be claimed until order ownership, captured-payment confirmation, idempotent webhooks and durable records exist.

## Important requirements and blockers

**This branch requires an Auth-linked database migration.** The live database has RLS enabled but no clients-owner policy and no `clients.owner_user_id` column. The migration proposal exists in draft PR #40, with stricter permission fix #42 and two-owner regression #43. The migration deliberately aborts until the real records are privately reconciled; **do not run it on production just to make this branch work**.

Legacy data requires manual reconciliation: one business was not mapped to a confirmed Auth identity; some leads lacked valid owner identity and/or slug. The correct behavior for ambiguous rows is to stay hidden, not auto-assign them to someone.

Other required configuration, in approved **staging only**, never in source or chat:

- `SUPABASE_SECRET_KEY` (server-only modern `sb_secret_` key, scoped to guarded form path).
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `LEAD_GUARD_HASH_SECRET` (shared abuse guard).
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (normal browser/SSR session path).
- Optional `GEMINI_API_KEY`, `GEMINI_MODEL`; no raw contact PII goes to model. Model live availability is unverified.
- `AUTH_CALLBACK_ORIGIN` for a trusted canonical HTTPS host, plus approved Supabase Auth redirect URL.

A successful CI build does NOT verify the Supabase schema, Auth sessions, data isolation, rate limiter, actual model, or e2e customer flow.

## CI and manual acceptance

Offline CI tests:
`node --experimental-strip-types --test tests/public-lead-guard.test.ts tests/public-submission-secret.test.mjs tests/manual-lead-validation.test.mjs tests/gemini-privacy.test.ts tests/auth-submission-outcome.test.mjs tests/auth-callback-origin.test.mjs`

Plus `npx tsc --noEmit` and `npm run build`, all with fake build-only environment variables.

**Before any production merge**, use synthetic data in a reviewed staging Supabase project:

1. Two accounts/clients A and B with verified `owner_user_id` mapping and real RLS auth JWTs.
2. A's dashboard shows only A; B's only B. A cannot update/delete B's lead, including a public lead with NULL `user_id`.
3. Anonymous Data API cannot read or write clients/leads directly. Public enquiry **server action** inserts only after matching registered slug and Redis guard.
4. Invalid form, missing slug, missing secret, Redis down, duplicate, rate limit, database down and retry each display a truthful outcome.
5. Manual input validation, model fallback and status update (including 0-row failure) work.
6. Login email confirmation and PKCE callback with valid/invalid codes on exact verified host.
7. Checkout always returns 503 and no payment orders are created.
8. Rerun Supabase Security Advisors, inspect browser network requests for secrets, and check 390px/mobile UX.
9. Only after reconciliation + staging acceptance obtain founder approval for coordinated RLS/grant changes and release. Keep a reviewed database backup/rollback plan.

No real user records, payment transactions, customer messages, production env variables or data rows were changed by this PR.

## Integration caveats

- The feature PRs remain separate drafts. Do not merge them alongside this consolidated branch without resolving duplicate changes.
- `getLeads()` still returns [] if data cannot load; the actual dashboard displays an explicit unavailable state. This can be improved in the next iteration.
- Client-side CRM list is limited by PostgREST default row limits and needs reviewed server pagination for scale.
- Website leads have NULL `user_id`, so mutating them must be authorized by business slug + RLS. Historic non-null orphan slugs are deliberately not visible with this scoped query.
- A later subscription/payment feature requires its own verified implementation; this branch intentionally disables checkout.
