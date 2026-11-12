# LeadFlow AI release candidate — 2026-11-13 IST

- [x] Establish ancestry: PR54 contains PR53 and PR49; reuse without duplicate merges.
- [x] Inspect actual live schema and aggregate audit without customer PII or mutations.
- [x] Correct own legacy lead status/delete scope; add owner-scoped follow-up save/clear.
- [x] Display honest scoring explanations and logout failures.
- [x] Preserve refreshed/cleared session cookies across redirects; use Next16 proxy convention.
- [x] Gate public intake closed by default; require provisioned business at submission.
- [x] Require signed recent save receipt before rendering enquiry success.
- [x] Keep billing paused and verify actual handler rejects payment claims.
- [x] Bundle reviewable owner-RLS, quarantine and restrictive rollback proposals.
- [x] Run offline regressions, lint, typecheck and production build.
- [x] Run actual built app unauthenticated HTTP smoke.
- [x] Verify application candidate66f6c8e CI and READY preview; recheck final augmented test commit.
- [x] Verify official local Auth-issued JWTs through actual PostgREST and exact RLS, including CRUD/expiry/logout and39-row quarantine.
- [x] Verify actual local Next.js two-account HTTP customer journey with official Auth/JWT/PostgREST, real SSR cookies and generated Server Action IDs.
- [x] Verify actual public form multipart action through CA/SAN-verified fixture HTTPS, real PostgreSQL guard, write, owner dashboard, receipt, duplicates and retry.
- [x] Add existing-PostgreSQL shared spam guard with concurrent caps; no new Redis service.
- [x] Implement OFF-by-default test-key-only payment backend and durable ledger/concurrent processing.
- [x] Prepare exact atomic production cutover/recovery and verify a real pg_dump/restore on synthetic data.
- [x] Configure preview-only canonical URLs, private hash secret, postgres provider and explicit closed intake/billing gates.
- [ ] Verify hosted Supabase configuration and deployed two-account/browser/mobile journey.
- [ ] Privately review exact 39-record isolation manifest and all business owner mappings.
- [ ] Approve verified backup/restore and coordinated production migration/release.
- [ ] Verify actual Razorpay test dashboard/capture/webhook delivery and hosted key/API acceptance before considering live billing.

Production execution remains blocked by missing private owner/quarantine evidence, genuine production backup/restore evidence and secure hosted credentials. Do not infer these inputs from a generic continue request. No live billing or outreach is enabled.
