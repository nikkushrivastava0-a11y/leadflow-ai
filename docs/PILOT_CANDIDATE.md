# Pilot candidate: scope and release gates

## Confirmed environment separation
Production is Supabase pqzawjeggyxarwdkdynz and the live Vercel main deployment. Generic previews inherit its public DB URL today. New startup checks reject that target in preview/staging; do not remove the guard to make a preview work.

No hosted LeadFlow staging project/branch was found. A new project was quoted at $0/month, but creation returned INVALID_ARGUMENT and a subsequent inventory confirmed no new project. The backup dashboard redirects to sign-in, so a production backup is not verified. No production SQL, real-user data changes, production merge/deployment, real email, live payment or paid plan activation occurred.

## Product changes and operator setup

| Area | Implemented behavior | Enable / manual setup | Risk and rollback |
| --- | --- | --- | --- |
| Health | Configuration-only /api/health; variable names/codes without values; unsafe preview target refused at startup | Set LEADFLOW_ENV=staging and exact non-production LEADFLOW_STAGING_PROJECT_REF on the isolated preview | Does not claim DB/provider health. Revert app guard only after verifying environment separation; never point test writes at production |
| Email sandbox | Virtual Resend recipient by default; staging cannot use live-approved mode; fresh token-owned lease required | Keep LEADFLOW_EMAIL_MODE=sandbox; use server-side test credentials only | Provider acceptance/delivery not certified. Disable mail flags and preserve outbox receipts |
| Onboarding/embed | Confirmed Auth UUID obtains one idempotent workspace; user metadata supplies display name only; 14-day trial; safe copyable script tag and embedded server-result confirmation independent of receipt-cookie readback | Migration 08, approved public origin, server writer, LEADFLOW_ONBOARDING_ENABLED=true | Provisioning requires managed Auth schema access and reviewed clients ID shape. Disable flag; preserve clients/owner mapping/trial fields |
| Attribution/analytics/CSV | Allowlisted source/campaign, exact 30-day metrics and bounded transactional export; CSV formula neutralization | Migration 09, LEADFLOW_ANALYTICS_ENABLED=true; use utm_source/utm_campaign links | Response metric is first status change, not actual inbox response. Export limit 10,000; disable feature and retain metadata |
| Languages | English, Hindi, Hinglish form copy; persisted owner reply-language preference with Hindi fallback | Migration 10; owners select language in preferences | Model wording still needs human review. Existing language column remains for compatibility |
| Privacy/data tools | Privacy/terms templates, server-checked consent + notice version, owner JSON export and contact anonymization; active sends block both erasure and individual deletion | Migration 11; PRIVACY_CONTACT_EMAIL; LEADFLOW_PRIVACY_NOTICE_ENABLED and LEADFLOW_PRIVACY_TOOLS_ENABLED | Erasure is irreversible through the app and does not delete Auth accounts, aggregate reports or restricted audit/payment records. Do not run it on real records during release testing. Disable tools on rollback; do not pretend schema rollback restores erased contacts |
| Pricing/trials | Public pricing, 14-day request-time trial access and links into existing Razorpay test checkout | LEADFLOW_TRIALS_ENABLED=true, configured server test catalogue and test-only checkout flags | Test purchases are not live commercial subscriptions. No automatic renewal. Disable flags; preserve ledger/revocation history |
| Browser QA | Core owner/public journey plus feature-enabled new-business/language/export/erasure journey | Standard GitHub Actions Ubuntu runner with isolated official Auth/PostgREST/PG fixtures | Seeded local/CI acceptance only. Not hosted staging/provider certification; traces/session files disabled |

Incremental service spend activated by these changes: ₹0. No new paid resource exists. Runtime AI/mail can consume existing provider allowances if separately enabled; monitor the combined quota and retain the earlier operations-guide budgets. No live billing or paid tier is enabled. All product switches are false in .env.example. Per-feature schema down scripts are destructive disposable-staging teardown, not production recovery scripts.

## Exact production Auth values to review, not apply now
- Supabase Site URL: https://leadflow-ai-flame.vercel.app
- Allowed app redirect URL: https://leadflow-ai-flame.vercel.app/auth/callback
- Server AUTH_CALLBACK_ORIGIN and LEADFLOW_PUBLIC_ORIGIN: https://leadflow-ai-flame.vercel.app
- If Google OAuth is used, its Supabase provider callback is https://pqzawjeggyxarwdkdynz.supabase.co/auth/v1/callback; this is distinct from the app's /auth/callback.
- For staging, substitute the verified isolated preview origin and staging Supabase ref. No exact staging values can be certified until that environment exists. Avoid broad wildcard production redirects.

## Evidence and limitations
- Source/PR read-only recon: #55–#63 open/draft, mergeable and recorded Actions checks successful at inspection.
- General local checks: 113 offline tests, typecheck, lint, real PostgreSQL migration/rollback/reapply with a synthetic pg_dump/restore copy, production build and expanded HTTP smoke pass on the candidate source.
- The initial full Chromium core journey passed in Actions, including desktop login/status/follow-up/logout, mobile viewport, two-account isolation, spam/duplicates and protected endpoints. Its session-order harness issue was fixed without dropping assertions; rerun 43744250480 passed.
- Product-enabled browser checks are in e2e/product.spec.ts and the exact head's pilot-e2e workflow. Consult their actual latest result, not an earlier run, before claiming product browser acceptance.
- New onboarding uses confirmed Auth identity and current owner mapping, not user-editable roles/tenant IDs. Owner exports/analytics enforce the current business and RLS; foreign slug attempts cannot fetch another business's records.
- Forward feature SQL is additive. Existing-owner reconciliation and real production backup remain separate prerequisites, not solved by synthetic tests.

## Privacy/legal review
The privacy and terms pages are pilot templates. They describe data items/purpose, processors, rights requests, consent withdrawal, export/erasure scope and backup limitations. They do not claim DPDP certification or Consent Manager registration. The Indian DPDP framework has phased commencement; deployment-specific duties and dates, operator identity, verified privacy/grievance contact, retention periods and processor terms require review before real intake. Primary references checked: MeitY Gazette G.S.R.846(E) https://www.meity.gov.in/static/uploads/2025/11/53450e6e5dc0bfa85ebd78686cadad39.pdf and PIB's 14 November 2026 implementation update https://www.pib.gov.in/PressReleseDetailm.aspx?PRID=2336151&lang=1&reg=3.

## Still NO-GO for production
1. Create/verify genuinely free isolated hosted staging through a working authenticated path; never substitute the production ref or repurpose an unidentified project.
2. Verify a real production backup and successful isolated restore under the user's approved data-handling scope.
3. Apply/rehearse the complete staged schema with seeded users; validate hosted Auth/redirects, provider credentials and actual Resend virtual-recipient/Gemini/Razorpay TEST acceptance logs.
4. Configure preview-only variables, then verify the exact deployed commit and real preview browser flow. Do not reuse production data/credentials as a shortcut.
5. Review exact PR diffs and production migration/maintenance proposal. Production writes, main merges, real customer mail and live payment activation each still require the user's explicit APPROVED: <exact step> message.
