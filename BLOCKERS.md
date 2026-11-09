# LeadFlow AI — blockers and approval gates

Last reviewed: 2026-11-09 IST.
Never silently skip required checks. Link each unresolved blocker to a task.

## Blockers
- **B-01 / P0-05 — Supabase database currently inaccessible:** previous connected-project inspection reported `INACTIVE` and a schema query failed. Live schema/RLS rules are unverified. Do not claim the lead ownership model is secure until restored and tested.
- **B-02 — Design notes not in main:** `docs/DESIGN_REFERENCE_NOTES.md` and expanded AGENTS.md exist in unmerged Agent Studio branch/PR #10, not main. Read those before any UI modification. Do not merge design changes without visual QA.
- **B-03 — Paid launch gate:** The draft P0-03a HMAC helper in PR #27 passed synthetic unit tests, but is not wired to an authenticated order/entitlement system. Payment capture/amount, business ownership, replay/idempotent processing, and subscription activation remain unimplemented. The existing UI checkout must stay disabled until these are done. **Original finding:** existing Razorpay frontend success callback is not verified server-side. Do not process customer payments or advertise paid activation as working until order ownership, signature, captured status and idempotency are tested.
- **B-04 — Real browser visual/interaction QA:** preview build statuses do not prove the page was visually tested or that data-backed flows work.
- **B-05 — Testing access:** local dependencies/test runner may be unavailable. For each task use Vercel preview build where available and record what was actually verified.

- **B-06 / P0-12 — RESOLVED IN DRAFT PR #18:** New CI run https://github.com/nikkushrivastava0-a11y/leadflow-ai/actions/runs/42516442923 shows TypeScript check SUCCESS but ESLint fails with 5 errors: redundant `@ts-ignore` checkout import (1), two unescaped apostrophes in dashboard JSX (2), and two explicit `any` uses in upgrade button (2). Build stage skipped because lint failed. Fixed on the CI draft branch; run https://github.com/nikkushrivastava0-a11y/leadflow-ai/actions/runs/42516678879 passed lint, typecheck and build. Still draft, so main has the old lint issues.

- **B-07 / P0-07 — Client lookup/RLS not verified:** The new draft public form verifies a slug via `clients` SELECT before insertion. Supabase leadflow-ai remains INACTIVE (re-checked 2026-11-09); cannot prove that anonymous sessions can read valid client slugs or insert only for their assigned tenant. Before merge, test on a nonproduction restored DB and consider a narrow, safe RPC for public slug validation rather than broad SELECT rights.
- **B-08 / P0-08 — Distributed rate limiting unavailable without storage:** In-memory request counters are unsafe in serverless deployments. A durable shared rate limit provider or database-backed mechanism must be designed, tested and reviewed. No CAPTCHA keys or paid services will be provisioned without approval.

- **B-07 / P0-07 — Anonymous client lookup RLS unverified:** PR #23 validates forms and fails closed if `clients.slug` cannot be read anonymously. Connected Supabase `leadflow-ai` project still reported INACTIVE on 2026-11-09. Staging owner/anonymous RLS test required before merging, or valid forms could fail.
- **B-08 — Stacked/overlapping draft PRs:** #19 depends on #14; #23 depends on #17. #18 touches checkout/upgrade UI files also edited in #13/#15. Merge only after review/rebase and conflict resolution, never automatically.

- **B-09 / P0-08 — Draft Redis guard requires founder-reviewed staging configuration:** PR #30 implements a fail-closed, atomic per-tenant/per-contact limiter and dedupe reservation using Upstash Redis REST, with mocked CI + preview build verified. Without approved `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` and `LEAD_GUARD_HASH_SECRET` on staging, merging it would block ALL legitimate public enquiry inserts. A production/staging provider account, its costs/data processing, and env setup require user approval. Do not enable service or provision resources without approval. True exactly-once deduplication also requires a separate unique constraint once Supabase schema is accessible. PR is stacked on #23 -> #17.

- **B-10 / P0-11 — AI scoring merge dependency and live-model verification:** Privacy PR #29 stacks on model migration PR #16. Synthetic CI, typecheck and Vercel build passed, but no actual Gemini API call or real personal-data consent testing was performed. Do not claim autonomous scoring works with a configured user account until a model entitlement and safe integration test are verified.
- **B-11 / P2-04a — Production metadata / social preview verification:** SEO PR #31 passed its GitHub CI build, but a current Vercel head preview / browser crawler test, official custom domain and professionally designed social preview image remain unverified. The existing landing copy still contains broad Gemini AI claims that need a separate accuracy audit before promotion.
- **B-12 / P1-06a — Pitch composer is local-only:** PR #33 passed synthetic CLI tests/typecheck/build, but is NOT an authenticated customer-facing pitch-writing page and does not contact real businesses. The founder must verify each public fact and approve any message before sending; the complete P1-06 in-app feature remains open.

## NEEDS MY APPROVAL
- Merge any draft PR to `main` or deploy to production.
- Resume or change the existing production Supabase project and confirm a staging environment for safe RLS testing.
- Approve shared Redis provider/cost and configure its three server-only credentials in staging before any P0-08 merge.
- Update real Supabase schema/RLS or any real customer data.
- Rotate/inspect credentials, provision paid hosting, make a purchase, or create payment/refund transactions.
- Send customer-facing messages, contact real businesses, or enable automated outreach.
- Make commercial use of a hosting plan before commercial terms are confirmed.

## Safe default
Keep every PR in Draft; read-only investigation and source changes to a new branch are allowed under the founder's instructions. Log any uncertainty in PROGRESS.md and move to another independent task if blocked.

- **B-13 / P3-03a — CRM stage guard verification pending:** Draft PR #35 was created from main and GitHub Actions run 42525286447 was queued, with Vercel pending at first check. Confirm green CI and actual staging database allowed statuses before merge. This guard does not replace tenant isolation or the pending PR #14 ownership fix.

- **B-13 update:** PR #35 unit-test workflow run 42525286447 completed SUCCESS; staging schema alignment and functional tenant isolation remain pending.

- **B-14 / P2-08a — Draft privacy FAQ not publishable:** PR #36 provides only proposed copy. Actual data controller/processor roles, lawful basis, consent recording, retention/deletion workflow, public policy URL and synthetic staging RLS remain unverified. Founder/legal review and browser accessibility QA are required before incorporating the text into the live form. Do not represent the draft as an implemented privacy policy.

- **B-15 / P1-08a — Clipboard and domain verification:** Draft PR #37 adds manual link copying but GitHub Actions had no workflow runs and Vercel was pending at first check. Clipboard permission denial, keyboard/screen-reader behaviour, and existing hard-coded public form domain need preview/browser QA. QR is not implemented; P1-08 stays open.


- **B-16 / P1-04b — Offline prospect verification gate:** Draft PR #38 accepts founder-supplied public business records but does not independently establish their truth, source ownership, outreach permissions or business relevance. Synthetic Actions run 42540236679 was in progress at initial review. Human fact checking and explicit approval required before any outreach; parent P1-04 remains open.

- **B-16 CI follow-up:** Synthetic Actions run 42540236679 completed SUCCESS; independent source verification and outreach permission remain unresolved.

- **B-17 / P1-05a — Offline site prototype not a publishable website:** PR #39 produces local noindex HTML only. GitHub synthetic workflow and browser QA need confirmation; actual business identity, course descriptions, domain ownership, privacy notice, accessibility and contact destination require founder approval before publication. No customer-facing deployment or live lead capture is implemented.

## 2026-11-09 security incident follow-up — verified live
- **P0 / CRITICAL: Real exposed data with RLS OFF.** Supabase project is now ACTIVE_HEALTHY and holds actual business/lead records. `clients` and `leads` RLS OFF + broad `anon` grants; advisor ERROR. Existing policies are not enforced. Do **not** onboard, advertise public forms, or describe the app as secure. This is an active data-exposure risk until verified containment.
- **Legacy mapping blocker:** At least one business lacks a confirmed Auth identity and 38 legacy leads lack either an identified confirmed business owner or valid Auth user UUID. Do not guess, mass-delete or automatically reassign these records. Keep reconciliation private and human-reviewed.
- **Release dependency:** Proposed least-privilege/RLS SQL in draft PR #40 deliberately fails current preflight and is not applied. Merging it without validated public-form server-only submission will stop direct anonymous intake. Choose a reviewed, backup-backed containment strategy and a staging security test plan before live SQL.
- **Founder production approval needed:** Either explicitly accept short dashboard/form downtime for an emergency RLS + revoke-all containment, or approve a coordinated staged cutover after private data reconciliation. The assistant has NOT performed either live mutation.
- **Auth hardening:** Supabase Security Advisor warns that leaked-password protection is disabled; review Auth settings separately from P0 RLS.

## 2026-11-09 follow-up — founder has enabled RLS (verified read-only)

- **B-01 partially improved, NOT resolved:** `public.clients` and `public.leads` now both have `relrowsecurity = true`, and the project's status is `ACTIVE_HEALTHY`. The historical RLS-OFF entries above are previous snapshots and must not be interpreted as today's state.
- **Critical non-row-scoped privilege issue remains:** `anon` and `authenticated` still have `TRUNCATE` permission on BOTH tables (confirmed by `has_table_privilege`). RLS does not control table-wide TRUNCATE; normal PostgREST API operations do not imply direct TRUNCATE access, but grants must be restricted in a reviewed production operation.
- **Owner dashboard currently blocked:** `clients` has zero SELECT policies under RLS; normal authenticated queries to `clients.slug` will not return a business profile. Do not add a permissive `USING (true)` policy.
- **Public form currently blocked:** public form inserts have NULL `user_id`; existing `leads` INSERT policy requires `auth.uid() = user_id`; no anonymous public insert policy. Server-only protected submission exists only in draft PR #41, not production.
- **Lead updates/deletes blocked:** there are no UPDATE/DELETE policies. Existing 43 leads with NULL `user_id` will be invisible to the historic direct user-ID SELECT policy until a secure business owner mapping is implemented.
- **Security Advisor improved:** previously reported disabled-RLS errors cleared. Remaining: `rls_enabled_no_policy` (clients, INFO), leaked password protection disabled (WARN).
- **Production decision still required:** restrict non-row-scoped grants, stage Auth-linked owner policies, safely reconcile unmatched business and legacy leads, test public submission with approved rate limiter, and run two-business authorization tests. Do NOT enable wide-open anon policies.
- No live SQL writes or schema changes were performed by the assistant in this recheck.

## 2026-11-09 continued — least-privilege and tenant tests
- **P0-05c proposed hardening:** PR #42 passed disposable Postgres integration, typecheck and Next build. Production still grants TRUNCATE/TRIGGER/REFERENCES to anon and authenticated. Review-only SQL is outside auto-deploy paths; no live permissions altered.
- **P0-05d proposed RLS coverage:** PR #43 passed isolated two-tenant RLS migration tests and full build. It depends on PR #40, but cannot establish real Auth JWT behavior or safely resolve the 1 unmatched business / 38 ambiguous legacy leads. No live migration applied.
- **Read-only anon role check SUCCESS:** In an explicitly READ ONLY transaction with `SET LOCAL ROLE anon`, aggregate SELECT on clients/leads returned zero rows each; RLS is preventing anonymous read access under that role. This does NOT mean the unrestricted TRUNCATE grant is safe or prove full API security.
- **NEEDS FOUNDER APPROVAL:** coordinated staging environment, validated owner reconciliation, budget/privacy assessment for shared Redis+server secret, and a production maintenance/cutover decision. Do not paste credentials into GitHub or the chat.
