# LeadFlow AI — blockers and approval gates

Last reviewed: 2026-11-09 IST.
Never silently skip required checks. Link each unresolved blocker to a task.

## Blockers
- **B-01 / P0-05 — Supabase database currently inaccessible:** previous connected-project inspection reported `INACTIVE` and a schema query failed. Live schema/RLS rules are unverified. Do not claim the lead ownership model is secure until restored and tested.
- **B-02 — Design notes not in main:** `docs/DESIGN_REFERENCE_NOTES.md` and expanded AGENTS.md exist in unmerged Agent Studio branch/PR #10, not main. Read those before any UI modification. Do not merge design changes without visual QA.
- **B-03 — Paid launch gate:** existing Razorpay frontend success callback is not verified server-side. Do not process customer payments or advertise paid activation as working until order ownership, signature, captured status and idempotency are tested.
- **B-04 — Real browser visual/interaction QA:** preview build statuses do not prove the page was visually tested or that data-backed flows work.
- **B-05 — Testing access:** local dependencies/test runner may be unavailable. For each task use Vercel preview build where available and record what was actually verified.

## NEEDS MY APPROVAL
- Merge any draft PR to `main` or deploy to production.
- Update real Supabase schema/RLS or any real customer data.
- Rotate/inspect credentials, provision paid hosting, make a purchase, or create payment/refund transactions.
- Send customer-facing messages, contact real businesses, or enable automated outreach.
- Make commercial use of a hosting plan before commercial terms are confirmed.

## Safe default
Keep every PR in Draft; read-only investigation and source changes to a new branch are allowed under the founder's instructions. Log any uncertainty in PROGRESS.md and move to another independent task if blocked.
