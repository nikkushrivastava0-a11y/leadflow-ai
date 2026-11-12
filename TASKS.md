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
- [ ] Verify final branch GitHub CI and Vercel preview at exact commit.
- [ ] Verify real Supabase two-account Auth/JWT/CRUD journey in an authorized free test environment.
- [ ] Privately review exact 39-record isolation manifest and all business owner mappings.
- [ ] Approve verified backup/restore and coordinated production migration/release.
- [ ] Complete separately verified payment implementation/provider test acceptance before enabling paid upgrades.

Production migrations, customer-data changes, merging main, promotion, live billing and outreach are excluded from this session's authorization.
