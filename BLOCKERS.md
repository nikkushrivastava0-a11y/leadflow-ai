# LeadFlow AI — blockers and approval gates

Last reviewed: 2026-11-09 IST.
Never silently skip required checks. Link each unresolved blocker to a task.

## Blockers
- **B-01 / P0-05 — Supabase database currently inaccessible:** previous connected-project inspection reported `INACTIVE` and a schema query failed. Live schema/RLS rules are unverified. Do not claim the lead ownership model is secure until restored and tested.
- **B-02 — Design notes not in main:** `docs/DESIGN_REFERENCE_NOTES.md` and expanded AGENTS.md exist in unmerged Agent Studio branch/PR #10, not main. Read those before any UI modification. Do not merge design changes without visual QA.
- **B-03 — Paid launch gate:** existing Razorpay frontend success callback is not verified server-side. Do not process customer payments or advertise paid activation as working until order ownership, signature, captured status and idempotency are tested.
- **B-04 — Real browser visual/interaction QA:** preview build statuses do not prove the page was visually tested or that data-backed flows work.
- **B-05 — Testing access:** local dependencies/test runner may be unavailable. For each task use Vercel preview build where available and record what was actually verified.

- **B-06 / P0-12 — RESOLVED IN DRAFT PR #18:** New CI run https://github.com/nikkushrivastava0-a11y/leadflow-ai/actions/runs/42516442923 shows TypeScript check SUCCESS but ESLint fails with 5 errors: redundant `@ts-ignore` checkout import (1), two unescaped apostrophes in dashboard JSX (2), and two explicit `any` uses in upgrade button (2). Build stage skipped because lint failed. Fixed on the CI draft branch; run https://github.com/nikkushrivastava0-a11y/leadflow-ai/actions/runs/42516678879 passed lint, typecheck and build. Still draft, so main has the old lint issues.

- **B-07 / P0-07 — Client lookup/RLS not verified:** The new draft public form verifies a slug via `clients` SELECT before insertion. Supabase leadflow-ai remains INACTIVE (re-checked 2026-11-09); cannot prove that anonymous sessions can read valid client slugs or insert only for their assigned tenant. Before merge, test on a nonproduction restored DB and consider a narrow, safe RPC for public slug validation rather than broad SELECT rights.
- **B-08 / P0-08 — Distributed rate limiting unavailable without storage:** In-memory request counters are unsafe in serverless deployments. A durable shared rate limit provider or database-backed mechanism must be designed, tested and reviewed. No CAPTCHA keys or paid services will be provisioned without approval.

## NEEDS MY APPROVAL
- Merge any draft PR to `main` or deploy to production.
- Update real Supabase schema/RLS or any real customer data.
- Rotate/inspect credentials, provision paid hosting, make a purchase, or create payment/refund transactions.
- Send customer-facing messages, contact real businesses, or enable automated outreach.
- Make commercial use of a hosting plan before commercial terms are confirmed.

## Safe default
Keep every PR in Draft; read-only investigation and source changes to a new branch are allowed under the founder's instructions. Log any uncertainty in PROGRESS.md and move to another independent task if blocked.
