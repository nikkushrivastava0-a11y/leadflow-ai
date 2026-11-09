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
