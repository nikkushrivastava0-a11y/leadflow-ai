# LeadFlow AI — execution log

> All activity is in this response/session, not asynchronous background work.
> Main/production are unchanged. Each implementation lives in a separate draft PR.
> Baseline: main c39a0ef (2026-06-21); initiated 2026-11-09 IST.

## 2026-11-09 — Setup
- Read main-branch AGENTS.md, package.json, public form, actions, scoring and checkout code; also read the unmerged visual contract from feature/agent-ops-dashboard-20261109.
- Confirmed that static /form references params.slug even though the URL does not contain a slug; this is the first targeted bug.
- Created the prioritized TASKS.md queue on tracking branch `ops/overnight-tracking-20261109`.
- No build/test assertions yet. No money spent, secrets accessed, customer data read, or production touched.

## P0-01 — Static /form crash guard
- **Draft PR:** https://github.com/nikkushrivastava0-a11y/leadflow-ai/pull/12
- **Source:** `src/app/form/page.tsx` — replace invalid dynamic slug assumption with redirect to `/`. Dynamic `/form/[slug]` unchanged.
- **Build:** Vercel preview `dpl_9EhKEBnzbYzyVNMboCEHmEmfCB3z` at commit `c62cff3` is READY; log confirms compiled route `/form`, no build errors.
- **Tests:** No local execution possible because isolated container cannot resolve GitHub. Authenticated browser assertion of `GET /form` redirect not yet performed; no claim of user-flow verification.
- **How to verify:** Open the PR preview, visit `/form` and confirm homepage redirect; then visit a valid `/form/{clientSlug}` after DB restoration.
- **Status:** PR prepared + build passed; live route QA pending (does not block next independent fix).

## P0-02 — Authenticated checkout initiation
- **Draft PR:** https://github.com/nikkushrivastava0-a11y/leadflow-ai/pull/13
- **Source:** `src/app/api/checkout/route.ts` — guard Razorpay order creation behind `auth.getUser()`; missing payment credentials produce 503 instead of attempting SDK init; no-store success response.
- **Build:** Vercel preview `dpl_7xwR4fHHYBzVtXTxkRnN7JDgsPyZ` for commit `e6192a4` is READY, route `/api/checkout` compiled, build log contains no errors.
- **Tests:** No live authenticated/unauthenticated API request tests performed. API keys and client sessions were not accessed. No real payment started.
- **How to verify:** With preview, POST without Supabase session must return 401; with valid session but no configured keys must return 503. The latter should be tested in a nonproduction environment.
- **Status:** Guard implementation committed and preview build passed. **P0-03 payment verification, ownership persistence and rate limiting remain required before accepting money.**

## P0-06 — Business ownership alignment
- **Draft PR:** https://github.com/nikkushrivastava0-a11y/leadflow-ai/pull/14
- **Source:** `src/lib/actions.ts` — derive authenticated business slug consistently with dashboard; use `client_slug` for listing and mutating public/manual leads; include `client_slug` in manual inserts; validate status and check affected rows.
- **Build:** Vercel preview `dpl_Dz94uVTZFhNvoZhKzUhXp9nkpNDa` for commit `5a75638` READY; build log no errors.
- **Tests:** No two-tenant Supabase integration tests possible: project inactive and live RLS/schema unavailable. **Do not merge to production until RLS has been independently verified;** UI/server filters alone are not a security boundary.
- **How to verify:** With test owner A, submit manual+public leads; both must appear. Owner B must not view, update, delete or insert leads for A through client SDK or server action.
- **Status:** Code-only fix and build complete, DB acceptance criteria remain blocked under P0-05.

## P0-04 — Remove unverified payment-success experience
- **Draft PR:** https://github.com/nikkushrivastava0-a11y/leadflow-ai/pull/15
- **Source:** `src/components/upgrade-button.tsx` — replace unverified payment-success handler and live Razorpay script with disabled, clearly labelled upgrade CTA while backend verification is incomplete.
- **Build:** Vercel preview `dpl_GapaQJMoe6vkrP1PHBjmsw28EeiU` at commit `3f7d870` READY; no build errors in log.
- **Tests:** Manual browser click/disabled-state test pending. Source code cannot initiate payment from this button. `/api/checkout` requires its own P0-02 guard; this PR alone is NOT a complete payments fix.
- **How to verify:** Inspect button in preview, confirm disabled; confirm no checkout script or request is triggered and no false success toast appears.
- **Status:** Code/preview build complete. Payment feature intentionally inactive until P0-03 server verification and approvals.

## P0-09 — Public enquiry failure feedback
- **Draft PR:** https://github.com/nikkushrivastava0-a11y/leadflow-ai/pull/17
- **Source:** `src/app/form/[slug]/page.tsx` — failed inserts redirect to an explicit failure screen with retry rather than silently returning; original success path still uses redirect.
- **Build:** Vercel preview `dpl_JDxgoShsNzBEyViwXJVgnB9eZN1M` for commit `c39fd86` READY, build log finished successfully.
- **Tests:** Browser reproduction of a failed Supabase write remains pending. No real customer records or database changes involved.
- **How to verify:** In a nonproduction test with failing Supabase insert, submit form; page must render `?error=save` with alert and retry link. Successful test submission should redirect to `?success=true`.
- **Status:** Code + preview build complete; failure-path QA pending.

## P0-10 — Retired Gemini model replaced, fallback truthful
- **Draft PR:** https://github.com/nikkushrivastava0-a11y/leadflow-ai/pull/16
- **Sources:** `src/lib/gemini.ts`, `tests/gemini.test.ts`, `package.json`, `.github/workflows/scoring-tests.yml`.
- **Changes:** retired 2.0 Flash → current stable/configurable 3.5 Flash-Lite default; bound 8s model request; no raw names/contacts in API prompt; fallback labeled rule-based; numeric zero remains zero; parsed JSON validated.
- **Model source:** Google Gemini API deprecations and models documentation: https://ai.google.dev/gemini-api/docs/deprecations and https://ai.google.dev/gemini-api/docs/models
- **Build:** Vercel preview `dpl_82rfmGXN8xJpn6WJ1iC7V6M5aJXS` for commit `aac5992` READY.
- **Unit tests:** GitHub Actions https://github.com/nikkushrivastava0-a11y/leadflow-ai/actions/runs/42516212884 **SUCCESS**. `scoring-tests` job and `Unit tests (no external API calls)` step confirmed successful.
- **Tests not done:** No real Gemini API call, credential read, budget verification, or privacy consent audit. The model may depend on provider account entitlements. These remain launch gates.
- **How to verify:** Inspect PR and Actions run; in a configured nonprod environment submit synthetic lead, verify AI score; disable key and verify clearly labelled rule-based fallback without blocking lead capture.
- **Status:** Code, CI unit tests and preview build passed. Live model and policy verification pending.

## P0-12 — Enforced quality gates
- **Draft PR:** https://github.com/nikkushrivastava0-a11y/leadflow-ai/pull/18
- **Sources:** `.github/workflows/quality.yml`, plus minimal existing-lint fixes in `src/app/api/checkout/route.ts`, `src/app/dashboard/page.tsx`, and `src/components/upgrade-button.tsx`.
- **Initial CI:** https://github.com/nikkushrivastava0-a11y/leadflow-ai/actions/runs/42516442923 FAILED at lint due to 5 pre-existing errors. Recorded in B-06; source fixes committed without suppressing checks.
- **Final CI:** https://github.com/nikkushrivastava0-a11y/leadflow-ai/actions/runs/42516678879 SUCCESS, verified jobs: npm ci, typecheck, lint, optional tests and production compilation all SUCCESS.
- **Vercel:** latest preview `dpl_B2h8qB3mM7PuZB1hVwc878k3dqrL` READY for commit `d242928`.
- **How to verify:** Open final Actions run; ensure all quality steps green. Note dummy CI environment values verify compilation only; no real DB/payment test.
- **Status:** Ready as draft PR; may conflict with P0-02 and P0-04 in files also edited. Rebase/resolve before merge.

## P1-01 — CRM stage editing (stacked on ownership fix)
- **Draft PR:** https://github.com/nikkushrivastava0-a11y/leadflow-ai/pull/19
- **Dependency:** PR #14 `fix/p0-06-tenant-consistency-20261109`; PR #19 targets that branch, not main.
- **Source:** `src/components/leads-table.tsx` — role-specific lead status selector, save progress, rollback on failure, toast feedback, server refresh.
- **Build:** Vercel preview `dpl_BmYEzpYuhySUzNwGQF7H7vJdrTb3` at commit `745a767` READY.
- **Tests:** Browser status change and cross-tenant RLS acceptance NOT run because Supabase remains inaccessible. No real data altered.
- **How to verify:** After restoring staging DB, create two synthetic client accounts; change statuses on each owner's lead, deliberately induce a failed save to confirm rollback, and verify another owner cannot mutate that lead.
- **Status:** Draft PR + build passed, human acceptance and prerequisite RLS approval pending.

## P0-07 — Public enquiry validation and client existence guard (continuation)
- **Draft PR:** https://github.com/nikkushrivastava0-a11y/leadflow-ai/pull/21
- **Files:** `src/lib/public-lead-validation.ts`, `src/app/form/[slug]/page.tsx`, `tests/public-lead-validation.test.ts`, `package.json`, `.github/workflows/public-form-tests.yml`.
- **Changes:** validates strict client slug format, string-only name/email/phone, lengths and email/phone syntax on server. Before database insert, queries `clients` for the submitted slug; invalid/unknown/write-error flows display explicit error. No storage or production changes.
- **Unit tests:** GitHub Actions https://github.com/nikkushrivastava0-a11y/leadflow-ai/actions/runs/42516982158 **SUCCESS**, validation job and test step succeeded.
- **Build:** Vercel preview `dpl_9QBfw7GjREcbEuky4bb4uy2Byrno` **READY**, preview route `/form/[slug]` built without errors at commit `043b773`.
- **Functional QA NOT done:** Supabase leadflow-ai database remains `INACTIVE`, verified again during this continuation. Cannot test actual slug SELECT privileges or anonymous RLS INSERT policy. This PR may reject legitimate public forms if `clients` is not readable to anon; review secure tenant lookup/RPC before merge.
- **Verify:** In nonproduction project, test valid slug -> lead created, invalid slug -> no insert, invalid name/email/phone -> error, unavailable DB -> visible error; then check DB policies for every business.
- **Status:** Draft code, build and unit tests completed; live integration blocked (B-01/B-07). Not safe to merge without RLS review.

## P0-12 — General PR quality gate (completed on existing draft PR)
- **Draft PR:** https://github.com/nikkushrivastava0-a11y/leadflow-ai/pull/18
- **Files:** `.github/workflows/quality.yml` and minimal baseline ESLint repairs in the PR.
- **GitHub Actions:** https://github.com/nikkushrivastava0-a11y/leadflow-ai/actions/runs/42516678879 **SUCCESS**; `npm ci`, `npx tsc --noEmit`, `npm run lint`, optional unit tests, and `npm run build` all completed green under Node 24.
- **Regression caution:** Independent fix PRs were branched from unchanged `main`; not all get the new checks until quality PR is reviewed/merged. No changes to production.
- **Verify:** Inspect GitHub Actions job step results for run 42516678879; review PR #18 before merging.
- **Status:** CI proposal and checks verified, still draft.

## P3-07 — Founder-led sales outreach playbook
- **Draft PR:** https://github.com/nikkushrivastava0-a11y/leadflow-ai/pull/20
- **Source:** `docs/SALES_OUTREACH_PLAYBOOK.md` — coaching ICP, 6 discovery questions, LinkedIn/email/permission-based WhatsApp drafts, 7-minute demo, honest pricing experiment, minimal funnel KPIs.
- **Build:** Vercel preview `dpl_CXGkN5nBJtwNAs454RLmRGCBic6U` READY.
- **Tests:** Static document; manual content review remains. **No messages were sent** or prospects contacted.
- **How to verify:** Review PR doc, personalise a message using a genuine public business fact, obtain founder approval before any send.

## P3-02 — Safe .env.example
- **Draft PR:** https://github.com/nikkushrivastava0-a11y/leadflow-ai/pull/22
- **Source:** `.env.example` — documented placeholder-only variable names; explicit distinction between public IDs and server-only keys; no credentials committed.
- **Build:** Vercel preview `dpl_4q77WbrWYBTU2VSCNyZHXZTj6q1N` READY.
- **Tests:** No runtime behaviour changed. File must still be reviewed for accidental secrets and Vercel env requirements before merging.
- **How to verify:** Open file in PR and confirm values are placeholders only.

## Overnight continuation
- Created a **finite six-run hourly overnight automation** scheduled for Nov 9, 2026, from approximately 02:00 to 07:00 IST. The prompt instructs read tracker, produce one independent draft PR per safe task, attempt tests/build, update logs, skip blockers, and avoid production/data/payment/outreach writes. Future successful work depends on actual tool access and each run's result. No claim that future work is completed in this log.

## P0-07 — Server-side public lead and slug validation
- **Draft PR:** https://github.com/nikkushrivastava0-a11y/leadflow-ai/pull/23
- **Dependency:** stacked on PR #17 (public error page); PR target is `fix/p0-09-visible-form-errors-20261109`, not main.
- **Sources:** `src/lib/public-leads.ts`, `src/app/form/[slug]/page.tsx`, `tests/public-leads.test.ts`, `.github/workflows/public-leads-tests.yml`.
- **Changes:** name/email/phone validation on server, digit-count limits and length bounds, normalized email, invalid-slug rejection, fail-closed existence lookup for client slug, distinct user-facing errors.
- **Tests:** GitHub Actions run https://github.com/nikkushrivastava0-a11y/leadflow-ai/actions/runs/42517199903 SUCCESS; `Unit tests (synthetic inputs only)` step confirmed successful.
- **Build:** Vercel preview `dpl_H3Y32qB8wC1VAxhzLZi4U4EFupy4` READY for commit `82e1be7`; logs finished without errors.
- **Not yet verified:** Real anonymous read of clients table, real database insert and RLS tenant protection. Read-only Supabase project status checked Nov 9: `INACTIVE`. This PR may reject legitimate forms until a safe public slug lookup policy is established.
- **How to verify:** With staging DB active and public-safe RLS, submit valid synthetic enquiry and ensure it appears for correct owner; unknown slug, invalid email and phone must fail without writing records.
- **Status:** Source, unit CI and preview build passed; **functional launch approval blocked by actual Supabase RLS**.

## Continuation — deduplicated P0-07 implementation
- A second P0-07 implementation was produced while another scheduled run was editing the same backlog. Our draft PR #21 had green GitHub unit tests and a READY Vercel preview, but was closed **unmerged** as a duplicate.
- **Authoritative P0-07 draft:** https://github.com/nikkushrivastava0-a11y/leadflow-ai/pull/23, stacked on P0-09 draft PR #17. Unit CI https://github.com/nikkushrivastava0-a11y/leadflow-ai/actions/runs/42517199903 SUCCESS; preview `dpl_H3Y32qB8wC1VAxhzLZi4U4EFupy4` READY.
- **Review gate:** The Supabase database remains inactive. Anonymous slug lookup / RLS, two-tenant isolation and real form submissions have NOT been tested. PR #23 cannot be considered production-ready until those tests pass. Review that PR and #17 together, resolving future main merge dependencies.

## P3-08 — Coaching-centre discovery/demo and pilot conversion
- **Draft PR:** https://github.com/nikkushrivastava0-a11y/leadflow-ai/pull/24
- **File:** `docs/COACHING_DEMO_PLAYBOOK.md`
- **Work:** six targeted discovery questions, seven-minute real-feature demo, 90-second genuine recording script, synthetic test data, honest objection replies, pilot KPI definitions and sales-to-product-to-CTO handoff. No fake testimonials, verified revenue claims or unsupervised outreach.
- **Vercel:** `dpl_JAYRepQBQqNCxDtuP6PMRRQsKR1V` READY at `874ef33`.
- **Tests:** Documentation-only; no live product/demo/customer testing and no message delivery.
- **How to verify:** Review the draft PR content for unsupported claims, use a staging system with synthetic leads, validate dashboard flow and record the demo only after browser QA.
- **Status:** PR created, build passed, founder review pending.

## P3-09 — Founder CFO weekly cost/revenue scorecard
- **Draft PR:** https://github.com/nikkushrivastava0-a11y/leadflow-ai/pull/25
- **File:** `docs/FOUNDER_REVENUE_SCORECARD.md`
- **Work:** eight-week blank tracking template for contacts, replies, demos, pilots, verified paying customers, MRR, cash collected, actual expenses, unit contribution and founder hours. Unknown metrics are `N/A` rather than fabricated zeroes.
- **Vercel:** `dpl_fjaJp2NQuE8zizkcmzdgjpLpbvvF` READY at `46a80ac`.
- **Tests:** Documentation-only; no financial accounts accessed or real numbers asserted.
- **How to verify:** Inspect PR and fill a copy in an approved private location, using actual receipts; never commit customer or financial secrets into this public repo.
- **Status:** PR created, build passed, founder review pending.

## P3-06 — Ethical pricing and pilot policy
- **Draft PR:** https://github.com/nikkushrivastava0-a11y/leadflow-ai/pull/26
- **File:** `docs/FOUNDER_PRICING_TRIAL_POLICY.md`
- **Work:** proposed ₹499/₹999/₹1,999 offers, a 14-day new pilot hypothesis, honour existing one-month commitments, explicit limits, billing/data/consent gates, no guaranteed admissions, trial-to-paid decision script.
- **Vercel:** `dpl_Ga9oxxP73qwtuNHKXVhVZ3NaK99h` READY at `ad892c4`.
- **Tests:** Document-only; no billing, legal/tax verification or real client transaction tested.
- **How to verify:** Review prices and promised features against validated code, review taxes and policies before publishing or quoting any offer.
- **Status:** PR created, build passed, founder approval pending.

## P0-03a — Server-side Razorpay HMAC primitives (partial payment security)
- **Draft PR:** https://github.com/nikkushrivastava0-a11y/leadflow-ai/pull/27
- **Files:** `src/lib/server/razorpay-signatures.ts`, `tests/razorpay-signatures.test.ts`, `package.json`, `.github/workflows/razorpay-signatures-tests.yml`.
- **Change:** Check Razorpay checkout signature using a server-owned order ID plus payment ID, HMAC-SHA256 and timingSafeEqual; check webhook signature against the **raw** request bytes with a separate webhook secret. Validate IDs, signatures and maximum webhook size.
- **Tests:** https://github.com/nikkushrivastava0-a11y/leadflow-ai/actions/runs/42518002622 **SUCCESS** using synthetic IDs and secret only; tampered IDs, wrong secret, altered webhook bytes and oversized body rejected in unit tests.
- **Build:** Vercel preview `dpl_6Y84F6GnRnDupcVYziJ7f6U43she` **READY**, commit `10b0da2`, no build errors observed.
- **Reference:** https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/
- **Not yet done:** Order-to-customer ownership mapping, payment capture/amount verification, idempotent webhook record processing, safe subscription activation, endpoint integration and auth/RLS tests. P0-03 remains **unchecked**. No real payments or live secrets used.
- **How to verify:** Inspect draft PR and green CI; use ONLY synthetic signatures and nonproduction integration later, including replay/idempotency tests after schema restoration.
- **Status:** HMAC core & unit tests done; full secure billing blocked by inactive Supabase and unverified schema.

## P1-04a — First research cohort of coaching-centre prospects (not outreach)
- **Draft PR:** https://github.com/nikkushrivastava0-a11y/leadflow-ai/pull/28
- **File:** `docs/COACHING_PROSPECT_RESEARCH_20261109.md`
- **Output:** 13 real named publicly discoverable coaching organisations in Greater Noida/West, with public area, source link where official site confirmed, neutral discovery angle and explicit `Not contacted` status. Includes qualification checklist and safe, human-reviewed opener. Source checks performed 2026-11-09 via public local/business discovery; locations/contact channels require revalidation by founder.
- **Build:** Vercel preview `dpl_75qcYpmPLER7tDui5HLV9S5Esm3T` READY at commit `7436047`; logs show production compile completed without errors.
- **Tests:** Static document only; no businesses contacted, site scraped with automated scripts, prospect CRM records created or customer data read.
- **How to verify:** Review the 13 source entries, independently confirm each centre's active business contact page, then select five for permission-respecting founder discovery conversations. Any messages require founder approval.
- **Status:** Research subtask complete; P1-04 general lead-finder product remains unchecked.

## P0-11 — Privacy-safe lead scoring and prompt injection controls (continuation)
- **Draft PR:** https://github.com/nikkushrivastava0-a11y/leadflow-ai/pull/29
- **Branch:** `security/p0-11-private-scoring-signals-20261109`, stacked on P0-10 PR #16 (not main).
- **Files:** `src/lib/lead-scoring-signals.ts`, `src/lib/gemini.ts`, `tests/gemini-privacy.test.ts`, `tsconfig.json`, `.github/workflows/scoring-tests.yml`.
- **Changes:** Free-text notes and contact identifiers never enter the model request. A fixed list of local boolean intent signals + allowlisted source category is sent instead. Gemini `generateContent` requests a schema, validates output, preserves score 0, and rejects unsafe URLs/markup in reasons; fallback stays labelled as rule-based.
- **Verification:** initial CI failed because Node's native TypeScript runner needed explicit .ts module import; fixed. Second failure was a test assertion on escaped JSON; fixed. Final GitHub Actions run https://github.com/nikkushrivastava0-a11y/leadflow-ai/actions/runs/42519166280 **SUCCESS**, `Unit tests (no external API calls)` passed.
- **Build:** Vercel preview `dpl_763LtjgLcGji3wvRWQf3U3ShitUe` at commit `4bd846a` **READY**, build logs completed without errors.
- **Still needed:** live account/model entitlement and privacy/consent review, real customer data handling checks, acceptance testing with Supabase, review of stacked dependency PR #16.
- **How to verify:** Review synthetic adversarial test in PR #29, check recorded CI run; after staging restoration, try synthetic lead scores and confirm logs/output never contain lead notes or contact details.
- **Status:** Source + CI + preview verified; no production or real API access.

## P0-08 — Distributed public-form abuse guard (continuation)
- **Draft PR:** https://github.com/nikkushrivastava0-a11y/leadflow-ai/pull/30
- **Branch:** `security/p0-08-public-form-guard-20261109` stacked on PR #23 (which is stacked on #17). Main unchanged.
- **Files:** `src/lib/server/public-lead-guard.ts`, `src/app/form/[slug]/page.tsx`, `tests/public-lead-guard.test.ts`, `.github/workflows/public-form-guard-tests.yml`, `docs/PUBLIC_FORM_ABUSE_GUARD.md`.
- **Change:** Atomic Lua EVAL via Upstash Redis REST for 60 attempts/hour per business and 4/hour per contact; honeypot field; 90-second duplicate reservation, 10-minute completion after insert, compare-and-delete rollback for failed insert. HMAC-hashed Redis keys do not include raw names, email or phone.
- **Fail-closed safety:** Missing/invalid credentials, provider outage and invalid protocol response reject inserts rather than silently bypass spam protections. **DO NOT MERGE until approved Redis provisioned** or real visitors will be unable to submit. No Redis/other paid service provisioned.
- **CI:** https://github.com/nikkushrivastava0-a11y/leadflow-ai/actions/runs/42519572438 **SUCCESS**, synthetic tests cover honeypot, provider errors, key privacy, duplicate/rate statuses and reservation commit/release.
- **Vercel:** `dpl_F1UCAuJVApFS7qQ6sXnqEjrEt32q` **READY**, head commit `b4a00bc`. Build compiled.
- **Still needed:** actual atomic Redis integration + budget check, Supabase RLS checks, real multi-business form QA and DB-level idempotency unique constraint for exact-once guarantees. No live customer records or credentials accessed.
- **How to verify:** inspect PR and CI; after staging Supabase + approved Redis exist, submit synthetic enquiries from two businesses, test concurrent duplicates, error retries, rate limits, and Redis-offline fail-closed behaviour before any merge.
- **Status:** Draft implementation + unit tests + preview build complete; live service configuration and cross-system tests blocked.

## P2-04a — Honest metadata, marketing-only sitemap and private page noindex
- **Draft PR:** https://github.com/nikkushrivastava0-a11y/leadflow-ai/pull/31
- **Branch:** `seo/p2-04-indexable-marketing-only-20261109` from main.
- **Files:** root `src/app/layout.tsx`, homepage `src/app/page.tsx`, `src/lib/site-origin.ts`, login/dashboard/form nested metadata layouts, `src/app/robots.ts`, `src/app/sitemap.ts`, tests/CI, `docs/SEO_METADATA_ROLLOUT.md`, and `tsconfig.json`.
- **Work:** replaces Create Next App title/description with honest in-development copy; adds text-only OpenGraph/Twitter descriptions, noindex on login/dashboard/forms, marketing-homepage-only sitemap and preview robots disallow. No visual layout changes.
- **Tests:** First full CI failed on TS5097 for explicit `.ts` import in Node native tests; fixed with `allowImportingTsExtensions` under noEmit. Final GitHub Actions run https://github.com/nikkushrivastava0-a11y/leadflow-ai/actions/runs/42520269177 **SUCCESS**: canonical unit test, `npm ci`, `npx tsc --noEmit`, `npm run build` all passed with synthetic env placeholders.
- **Vercel:** Preview registration for latest commit has not been confirmed; do NOT claim a browser-tested latest preview. Full CI production compile independently passed.
- **Not done:** Founder-approved social preview image, Search Console, marketing claims audit, actual crawler/HTTP inspection and final custom domain; parent P2-04 remains unchecked.
- **How to verify:** Review PR and green CI; at staging check /robots.txt blocks preview, sitemap includes root only and form/dashboard/login emit noindex; review real OG preview later with a designed image.
- **Status:** Code and CI build verified; browser/asset/production indexing still pending.

## P3-01 — Product-aware README and safety onboarding
- **Draft PR:** https://github.com/nikkushrivastava0-a11y/leadflow-ai/pull/32
- **Files:** `README.md` (replaces create-next-app boilerplate), `.github/workflows/readme-verify.yml`.
- **Changes:** documented grounded capabilities, Next/Supabase/Gemini/Razorpay stack, Windows PowerShell setup, proposed env var names without keys, actual route list, database ownership discrepancy, draft PR dependencies and first-customer validation gates. Explicitly avoids falsely claiming payment, AI scoring or tenant security works.
- **CI:** https://github.com/nikkushrivastava0-a11y/leadflow-ai/actions/runs/42520310425 **SUCCESS**; `npm ci`, `npx tsc --noEmit`, `npm run build` all passed with fake build-only env settings. No runtime customer tests.
- **Vercel:** A matching head preview was not confirmed. CI production compilation is verified, but not browser QA.
- **How to verify:** Review README draft and compare route/config/source statements with the current main branch. Check the linked CI run and confirm no secrets or unverified sales figures were added.
- **Status:** Documentation and test pipeline complete; main unchanged.


## P1-10 — Fictional coaching-centre demo dataset (2026-11-09)
- **Draft PR:** https://github.com/nikkushrivastava0-a11y/leadflow-ai/pull/34 (base main; branch docs/p1-10-synthetic-coaching-demo-20261109; commit a13a4ce).
- **File:** docs/SYNTHETIC_COACHING_DEMO.md. Five explicitly fictional lead records, reserved example.com emails, non-dialable placeholder phones, realistic enquiry notes, a five-minute staging walkthrough and explicit RLS/form acceptance checks.
- **Verification:** GitHub file creation and draft PR creation succeeded; source/document content reviewed. No local test or browser run; no CI/Vercel build outcome verified. Documentation-only change; build READY is not asserted. Functional QA remains blocked by inactive Supabase and RLS unknowns.
- **How to verify:** Review the PR text, ensure names/metrics are fictional and no contactable addresses are used; then with approved staging tenant validate form submission, dashboard visibility, status editing and two-tenant RLS as specified. Do not run against real customers.
- **Status:** Draft PR created; documentation task complete, live demonstration unverified. No production, payment or outreach actions.
## P1-06a — Local founder-reviewed pitch composer (work underway)
- **Draft PR:** https://github.com/nikkushrivastava0-a11y/leadflow-ai/pull/33
- **Branch:** `growth/p1-06a-reviewed-pitch-cli-20261109` from main.
- **Files:** `scripts/pitch-writer.mjs`, `tests/pitch-writer.test.mjs`, `docs/PITCH_WRITER_CLI.md`, `package.json` and `.github/workflows/pitch-writer-tests.yml`.
- **Work:** locally compose WhatsApp/business DM, LinkedIn and email *drafts only* using human-verified public business facts, with no LLM/provider cost, scraping, contact searching, storage or auto-sending. Input validation rejects obvious personal contact details and unsupported channels.
- **Tests:** GitHub Actions run https://github.com/nikkushrivastava0-a11y/leadflow-ai/actions/runs/42520690888: `npm run test:pitch` step **SUCCESS** on synthetic inputs.
- **Full build:** GitHub CI `npm ci`, TypeScript and Next build are still in progress. Do not mark P1-06a done until this finishes successfully (or a specific blocker is logged).
- **How to verify:** After green CI, use `npm run pitch -- --business "Example Coaching" --verified-fact "the institute offers entrance-exam batches" --channel all`. All output stays local; founder must verify actual fact and appropriate contact permissions before any send.
- **Remaining for P1-06:** An authenticated, premium-design in-app pitch writer plus customer workflow integration remains unimplemented.
- **Status:** Source and synthetic unit tests complete; full build verdict pending. Main/production untouched.

### P1-06a final CI verification
- GitHub Actions https://github.com/nikkushrivastava0-a11y/leadflow-ai/actions/runs/42520690888 **SUCCESS**. Steps `npm run test:pitch`, `npm ci`, `npx tsc --noEmit` and `npm run build` all explicitly passed.
- No Vercel head preview or manual UX test was confirmed. Functional CLI unit tests are synthetic; manual founder output review remains.
- **Status:** Subtask P1-06a now marked done; full P1-06 still open for the in-app user-facing implementation. No messages sent.



## 2026-11-09 — P3-03a CRM status validation
- **Draft PR:** https://github.com/nikkushrivastava0-a11y/leadflow-ai/pull/35 (branch `fix/p3-03a-lead-status-validation-20261109`, targets main; NOT merged).
- **Files:** `src/lib/lead-status.ts`, `src/lib/actions.ts`, `tests/lead-status.test.mjs`, `.github/workflows/lead-status-tests.yml`.
- **Change:** Allow only canonical `new/contacted/qualified/won/lost` stages, reject invalid IDs/stages before opening a database client. This is a narrow validation subtask; input validation and scoring parsing are still covered separately by unmerged PRs.
- **Verification at logging:** GitHub Actions https://github.com/nikkushrivastava0-a11y/leadflow-ai/actions/runs/42525286447 **QUEUED** (not passed); Vercel check **PENDING**. No local test execution or browser/Supabase functional QA claimed.
- **How to verify:** Check Actions test result; review allowed values against staging DB constraint; attempt invalid status with synthetic staging user and confirm no update; verify all five valid transitions and tenant isolation separately after Supabase RLS review.
- **Status:** Draft PR created, CI started; full P3-03 and live functional verification remain open.

- **CI follow-up:** GitHub Actions run https://github.com/nikkushrivastava0-a11y/leadflow-ai/actions/runs/42525286447 completed **SUCCESS** (workflow conclusion). No functional staging or browser QA performed; Vercel preview build not confirmed READY.

## 2026-11-09 — P2-08a privacy and FAQ copy review preparation
- **Draft PR:** https://github.com/nikkushrivastava0-a11y/leadflow-ai/pull/36 (branch `docs/p2-08a-form-privacy-faq-20261109`, base main; commit `3b6f9e1`).
- **File:** `docs/FORM_PRIVACY_FAQ_DRAFT.md` — proposed form notice, consent/retention considerations, realistic FAQ and explicit staging/legal/UX acceptance gates. Clearly marked NOT PUBLISHED. No real contact addresses, fabricated testimonials or security guarantees.
- **Verification:** GitHub branch, commit and draft PR confirmed; content manually reviewed. No local runtime test, CI result, Vercel preview result, or browser/functional QA verified. Documentation-only change. Parent P2-08 remains open.
- **How to verify:** Review PR #36; compare notice with actual approved data-flow and policy, check staging two-tenant RLS, obtain founder/legal approval, then implement and browser-test UI separately. Do not publish placeholders.
- **Safety:** No main merge, production deployment, customer records, payments, credentials or outreach touched.

## P1-08a — Manual enquiry form link copying (2026-11-09)
- **Draft PR:** https://github.com/nikkushrivastava0-a11y/leadflow-ai/pull/37
- **Branch:** `feature/p1-08a-copy-form-link-20261109` from main, head `f49637c`.
- **Files:** `src/components/form-share-link.tsx` (new), `src/app/dashboard/page.tsx`.
- **Implementation:** Add explicit clipboard copy button beside the already displayed owner-specific public form URL. Keyboard focus outline, live success/error text, and manual-copy fallback; no auto-send or new dependencies. Existing hard-coded form origin unchanged.
- **Verification attempted:** GitHub confirmed commits and draft PR. GitHub Actions returned **no PR-triggered workflow runs** for head at initial check; Vercel commit status was **pending**. No local npm build, browser clipboard permission test, or DB-backed form test performed. Do not claim build or functional QA passed.
- **How to verify:** Check Vercel preview build status and logs; sign into a synthetic owner dashboard, click Copy form link, paste into address bar and verify expected slug; deny clipboard permissions and verify fallback; keyboard tab/Enter and screen-reader status check; verify canonical domain in staging. QR remains a separate subtask.
- **Status:** Draft PR created; build/interaction QA pending. Parent P1-08 remains open.


## 2026-11-09 — P1-04b offline public-business prospect qualifier
- **Draft PR:** https://github.com/nikkushrivastava0-a11y/leadflow-ai/pull/38 (base main, branch `feature/p1-04b-offline-prospect-qualifier-20261109`, head `5f017a1`).
- **Files:** `scripts/qualify-prospects.mjs`, `tests/qualify-prospects.test.mjs`, `docs/OFFLINE_PROSPECT_QUALIFIER.md`, `.github/workflows/offline-prospect-tests.yml`.
- **Work:** Local, no-network CLI for founder-supplied public business facts. Rejects unapproved personal-contact fields, flags duplicates and stale/missing HTTPS sources, returns a review-only JSON queue. Does not scrape, email, contact, score real buyers, access CRM, or validate the existence of any business.
- **Verification:** GitHub confirmed four commits and DRAFT PR #38. GitHub Actions run https://github.com/nikkushrivastava0-a11y/leadflow-ai/actions/runs/42540236679 was **IN PROGRESS** at first check; not claimed passed. No local Node execution or functional real-business QA. No Next/Vercel preview verification (standalone CLI).
- **How to verify:** Check workflow conclusion; run `node --test tests/qualify-prospects.test.mjs` and `node scripts/qualify-prospects.mjs <local-json-file>` with fictional records; verify only six public business fields accepted and output never sends messages. Human review required before any actual business use.
- **Status:** P1-04b implementation in draft PR; parent P1-04 remains open. No production/main/customer/payment/outreach actions.

- **CI follow-up:** GitHub Actions run https://github.com/nikkushrivastava0-a11y/leadflow-ai/actions/runs/42540236679 completed **SUCCESS** (synthetic Node test workflow). This is not a full Next.js build, Vercel preview or real-world business validation.


## 2026-11-09 — P1-05a offline coaching site draft generator
- **Draft PR:** https://github.com/nikkushrivastava0-a11y/leadflow-ai/pull/39 (base main; independent branch feature/p1-05a-offline-coaching-site-copy-20261109).
- **Files:** scripts/coaching-site-generator.cjs; tests/coaching-site-generator.test.cjs; docs/COACHING_SITE_PROTOTYPE.md; .github/workflows/coaching-site-tests.yml.
- **Implementation:** local-only generator with field allowlist, HTML escaping, HTTPS contact-link validation, noindex metadata, explicit owner approval; refuses to overwrite existing files. No network calls, CRM integration, publishing or claims about outcomes.
- **Verification:** GitHub confirmed branch, four commits and draft PR. Synthetic Node test workflow was added; result pending at initial log. No local npm dependencies available to execute repository build. No functional browser/mobile test or Vercel build verified. A green workflow, if obtained, proves only synthetic generator tests.
- **How to verify:** Run `node --test tests/coaching-site-generator.test.cjs`; generate a draft with synthetic JSON using docs instructions, inspect escaped content and noindex; owner must approve business facts and contact URL before publication.
- **Status:** P1-05a implementation PR created; parent P1-05 remains open (no in-app builder or live domain).

- **CI follow-up:** GitHub Actions synthetic test run https://github.com/nikkushrivastava0-a11y/leadflow-ai/actions/runs/42546238194 completed SUCCESS for PR #39. This does not establish Next.js build, browser UX, or live customer functionality.
## P0-05a — Live Supabase restored; critical RLS and legacy ownership audit
- **Read-only Supabase result (2026-11-09):** `leadflow-ai` (`pqzawjeggyxarwdkdynz`) is `ACTIVE_HEALTHY`. `public.clients` and `public.leads` both have RLS **disabled**, while `anon` has broad SELECT/INSERT/UPDATE/DELETE and extra table privileges. Existing `leads` SELECT/INSERT policies are inactive. Supabase Security Advisor reports `rls_disabled_in_public` (ERROR, 2 tables) and `policy_exists_rls_disabled` (ERROR, leads).
- **Aggregate-only legacy data check:** 7 client profiles, 94 leads, 14 Auth accounts; 1 client not matched to confirmed Auth user. 51 leads missing `client_slug`, 5 with orphan slug, 43 missing `user_id`, 33 with invalid `user_id`. Overlapping groups; 38 leads lack both a verified business owner and valid Auth user. **No names/emails/phone content or raw records were read or copied.**
- **Draft PR:** https://github.com/nikkushrivastava0-a11y/leadflow-ai/pull/40
- **Files:** `docs/P0_05_RLS_RELEASE_PLAN.md`, `security/proposals/p0-05-reviewed-rls.sql` (staging-only, approval-gated proposal), `security/proposals/p0-05-readonly-audit.sql`, static safety tests and CI workflow. SQL aborts on ambiguous owners/data and is deliberately not an auto-migration.
- **Build:** Vercel preview deployment `dpl_42dLDLP9Dg6JZ7yrHiePpCrhC4BK` READY (head commit `5757a14`). GitHub CI run https://github.com/nikkushrivastava0-a11y/leadflow-ai/actions/runs/42582489331 reports SUCCESS for the same head commit; full duplicate CI run #42582530619 status checked separately.
- **Safety:** No SQL writes, schema changes, RLS toggles, grants, customer records, Auth users, secrets, payments or production deployments were modified. Public access vulnerability remains **OPEN**. Do not onboard more real customers.
- **How to verify:** Compare Supabase Security Advisor and READ ONLY aggregate query with draft plan. On privately provisioned staging environment, resolve owner mapping manually, test two synthetic tenants, review rate-limited service-only public submissions and rerun security advisors. Production RLS change requires user approval and coordinated release.
- **Status:** P0-05a audit and review draft finished. Parent P0-05 is NOT fixed; urgent production security decision is outstanding.

## P0-05b — Protected server-only public form writer (continuation)
- **Draft PR:** https://github.com/nikkushrivastava0-a11y/leadflow-ai/pull/41
- **Branch:** `security/p0-05b-server-only-form-write-20261109` stacked on PR #30 (which depends on #23 -> #17); separate RLS plan PR #40.
- **Files:** `src/lib/server/public-submission-client.ts`, `src/app/form/[slug]/page.tsx`, `tests/public-submission-secret.test.mjs`, `tsconfig.json`, `.github/workflows/public-server-writer-tests.yml`, `docs/P0_05B_PUBLIC_SERVER_WRITER.md`.
- **Change:** Public form checks server-side input, shared Redis rate limit/duplicate reservation, then accesses only exact business slug and fixed lead insert through server-only Supabase `sb_secret_` key. Missing/invalid key fails closed; no browser or SSR cookie-based service-role client. No real env keys configured.
- **CI:** First run failed inherited TypeScript test import-extension checks (TS5097). Fixed with `allowImportingTsExtensions` under `noEmit`. Latest https://github.com/nikkushrivastava0-a11y/leadflow-ai/actions/runs/42583267983 **SUCCESS**: secret tests, mocked Redis guard tests, typecheck and build.
- **Vercel:** Preview `dpl_5nTkGGCgtSdYz8onKt7NmVnBd5Gj` **READY** at commit `76b74ef`.
- **Live database:** No mutations. Read-only recheck confirms RLS still DISABLED on `public.clients` and `public.leads`. **Critical exposure remains**. Neither PR #40 nor PR #41 can be merged separately as a safe live fix.
- **How to verify:** Only in approved staging, configure server-only key plus shared Redis guard (never put in GitHub), run synthetic two-tenant RLS tests and anon-key direct API denial, then test valid/invalid public enquiries and error/duplicate scenarios.
- **Status:** Draft code/tests/build complete; live RLS fix and integration remain approval-gated. Parent P0-05 still OPEN.

## P0-05 live RLS follow-up — founder's manual change verified (2026-11-09)
- **Supabase project:** `pqzawjeggyxarwdkdynz` `ACTIVE_HEALTHY`; `public.clients` and `public.leads` now have `relrowsecurity=true` via founder's action, as read-only verified.
- **Security Advisor:** Previous disabled-RLS errors cleared. Still INFO `rls_enabled_no_policy` for `clients`, WARN leaked password protection disabled.
- **Permissions:** `anon` and `authenticated` continue to have SELECT/INSERT/UPDATE/DELETE and TRUNCATE table grants. Read-only `has_table_privilege` confirmed TRUNCATE on both tables for both roles. RLS does not protect TRUNCATE. Restrict grants in an approved coordinated step.
- **Policies:** `clients` has NO policies; owner dashboard's `clients.slug` lookup cannot work for ordinary authenticated users. `leads` has only SELECT and INSERT with `auth.uid()=user_id`, so anonymous form inserts (without user_id), UPDATE and DELETE lack authorization policies.
- **Aggregates:** 7 clients, 94 leads; 43 leads with NULL user_id remain outside existing owner-ID SELECT policy. No personally identifying records accessed.
- **Tracking/PR:** Security blocker log and [PR #40](https://github.com/nikkushrivastava0-a11y/leadflow-ai/pull/40) release plan updated to distinguish historical RLS-OFF findings from current RLS-ON state.
- **No changes** to live SQL, grants, data, secrets or production deployment from assistant. No end-to-end owner/anonymous flow test was claimed.
- **Status:** RLS toggles complete, functional tenant policies and privilege reduction remain **OPEN**; do not mark the full P0-05 resolved.


## P0-05c — Least-privilege API-role grants (continuation)
- **Draft PR:** https://github.com/nikkushrivastava0-a11y/leadflow-ai/pull/42
- **Files:** `security/proposals/p0-05c-revoke-excess-grants.sql`, `security/proposals/p0-05c-readonly-grant-audit.sql`, `security/tests/p0-05c-grant-integration.sh`, `.github/workflows/restrict-nonrow-grants.yml`, `docs/P0_05C_LEAST_PRIVILEGE_GRANTS.md`.
- **Read-only live confirmation:** Both tables retain RLS ON and have explicit direct `TRUNCATE`, `TRIGGER` and `REFERENCES` privileges for `anon` and `authenticated`. No such direct grants through PUBLIC in present ACLs; privileged postgres/service_role grants not touched. Table-wide TRUNCATE is not RLS-protected, but the standard REST Data API has no direct TRUNCATE endpoint.
- **Change proposed:** Approval-sentinel guarded, fully transactional removal of exactly these three non-row-scoped privileges while retaining SELECT/INSERT/UPDATE/DELETE and RLS. Not in auto-run migration path; postcondition failure rolls back.
- **Integration test:** GitHub Actions https://github.com/nikkushrivastava0-a11y/leadflow-ai/actions/runs/42590768041 **SUCCESS**. Disposable PostgreSQL 17 with synthetic roles/tables verified guard refuses unapproved execution, targeted grants removed when approved, SELECT/INSERT/UPDATE/DELETE preserved and RLS still enabled. `npm ci`, `npx tsc --noEmit` and `npm run build` also passed.
- **Vercel:** `dpl_5L2gfW6CWChbMue4ykpFgYEYjsKh` head `516732a` READY. Build only, not client functional QA.
- **Production status:** Absolutely NO Supabase SQL change applied. Same excessive grants still exist until approved deployment. Existing client owner policy and public form remain unresolved, and P0-05 parent task is still OPEN.
- **How to verify:** Review PR #42 and CI test, privately run the read-only grant-audit SQL on staging, obtain founder approval, apply only there and prove postcondition, then schedule a coordinated live change with rollback.

## P0-05d — Two-tenant RLS synthetic regression and live anonymous read check
- **Draft PR:** https://github.com/nikkushrivastava0-a11y/leadflow-ai/pull/43 (stacked on RLS proposal PR #40, NOT main).
- **Files:** `security/tests/p0-05d-two-tenant-migration.sh`, `.github/workflows/rls-two-tenant-tests.yml`, `docs/P0_05D_TWO_TENANT_TEST_PLAN.md`.
- **Changes:** Disposable PostgreSQL 17 test schema mimics auth.uid(), auth.users, clients and leads. Executes the exact draft RLS SQL from parent PR #40 after testing the missing approval sentinel, unmatched owner abort and unowned lead abort. Validates two mock owner accounts cannot read/change each other's leads; anonymous reads/truncate denied; own lead status edits, manual insert allowed; owner changes denied; legacy/public synthetic lead read rules verified. Zero production customer records.
- **CI:** https://github.com/nikkushrivastava0-a11y/leadflow-ai/actions/runs/42591583351 **SUCCESS**: isolated PostgreSQL test, `npm ci`, `npx tsc --noEmit`, `npm run build` all passed.
- **Vercel preview:** `dpl_AAFwvDFNmgbGDpP1f1UUtgwmdyQt` at head commit `296e399` **READY**.
- **Additional live read-only RLS check:** `BEGIN READ ONLY; SET LOCAL ROLE anon; SELECT aggregate row counts; ROLLBACK;` returned **0 readable clients, 0 readable leads** for anon while 7 clients/94 leads exist. This confirms anonymous SELECT is presently row-restricted. It does NOT test owner access, grant-based TRUNCATE exposure, JWT authentication or complete API authorization.
- **Remaining blocker:** Real Supabase staging and JWT owner A/B tests are still needed; current live owner profile policy missing. 1 unmatched owner and 38 ambiguous leads are not safe to auto-reconcile. Proposal SQL must not be applied until founder-approved staged release. No live database DDL, DML or key changes made.
- **How to verify:** Inspect synthetic CI and PR diff; in an approved nonproduction Supabase project repeat with real test JWTs, public form and API clients; review security advisor before production.

### P0-05d adversarial security regression — discovered and corrected
- Initial synthetic tenant test covered only consistent owner/slug combinations and passed. Added a conflicting fake row owned by business B in `client_slug` but bearing owner A's `user_id`; GitHub Actions https://github.com/nikkushrivastava0-a11y/leadflow-ai/actions/runs/42592291211 **FAILED as desired** with `expected=0 actual=1`. This reproduced a cross-tenant access flaw in the **unmerged RLS proposal**, not the live database.
- Root cause: proposed legacy fallback used `NOT EXISTS (SELECT FROM clients WHERE slug=...)` inside the leads RLS policy. Under clients RLS, a different business row is hidden from the caller, incorrectly satisfying `NOT EXISTS`.
- **Fix:** Permit direct `user_id` fallback only if `client_slug IS NULL`; non-null unmatched slugs must remain hidden until privately reconciled. Preflight now rejects conflicting verified `user_id` and business owner. Parent PR #40's SQL was patched with the same fix; stacked PR #43 adds the adversarial test.
- **Green regression:** https://github.com/nikkushrivastava0-a11y/leadflow-ai/actions/runs/42592968299 **SUCCESS** (PostgreSQL synthetic two-tenant checks, TypeScript, Next build). Parent PR #40 static regression test added after fix; final run verification recorded separately.
- **Release status:** Both PRs remain draft. No live DDL, DML, ownership reassignment, credentials or Vercel production changes. Orphan-slug historical records will need manual reconciliation rather than permissive owner fallback.
## P1-07 — CRM search, status, sorting and pagination
- **Draft PR:** https://github.com/nikkushrivastava0-a11y/leadflow-ai/pull/44
- **Files:** `src/lib/lead-table-controls.ts`, `src/components/leads-table.tsx`, `tests/lead-table-controls.test.mjs`, `.github/workflows/crm-controls-tests.yml`.
- **Changes:** Existing owner table gains search on name/email/phone/source, filters for new/contacted/qualified/won/lost, five sort choices, 10-row pagination and clear-filter/result-count controls; pure deterministic client-side selector clamps pages, preserves stable ordering and does not modify the data or make new requests. Existing dashboard design preserved.
- **CI:** Initial run https://github.com/nikkushrivastava0-a11y/leadflow-ai/actions/runs/42594479537 FAILED because an alphabetical-order test expected Neha before Naman. Corrected the test (code ordering was correct). Latest GitHub Actions https://github.com/nikkushrivastava0-a11y/leadflow-ai/actions/runs/42594604098 **SUCCESS** for revision `9bd8f4d6`; unit tests, `npm ci`, TypeScript and Next production compilation all passed with fake env variables.
- **Vercel:** Preview for early head `d7324994` READY. A verified Vercel deployment matching final head was NOT confirmed; CI Next build is green.
- **Limitations:** Operates only on authorized leads already fetched by dashboard. Not server-side large-table pagination, and does not fix existing missing `clients` owner RLS policy. No mobile/browser interaction QA or live Supabase test. Do not publish as customer-ready.
- **How to verify:** Review draft PR and CI, then once RLS owner access is restored test search/status/pages with synthetic leads using signed-in account on mobile and keyboard.
- **Status:** Small code feature and synthetic CI complete; full product usability gate remains open.


## P3-10a — Read-only dependency inventory and commercial release gates (2026-11-09)
- **Draft PR:** https://github.com/nikkushrivastava0-a11y/leadflow-ai/pull/45; independent branch `audit/p3-10-dependency-inventory-20261109` based on `main`.
- **Files:** `scripts/audit-dependencies.mjs`, `tests/dependency-inventory.test.mjs`, `.github/workflows/dependency-inventory.yml`, `docs/P3_10_DEPENDENCY_AUDIT.md`.
- **Work:** Read-only static package import inventory, package-lock root-manifest consistency check, four synthetic tests, nonblocking npm advisory summary, TypeScript and Next build CI. Does not uninstall, update, upgrade, access customers, secrets or production.
- **CI:** Initial GitHub run https://github.com/nikkushrivastava0-a11y/leadflow-ai/actions/runs/42595244794 FAILED at inventory because a deliberately fake `unlisted` import in a unit test was scanned as a real dependency. Fixed by excluding synthetic test fixtures from production import inventory. Unit tests and inventory passed in https://github.com/nikkushrivastava0-a11y/leadflow-ai/actions/runs/42595310178; npm install, audit, typecheck and build were still in progress when first checked. Latest head `5803ea46` CI result must be verified separately.
- **How to verify:** Review draft PR, run `node --test tests/dependency-inventory.test.mjs`, `node scripts/audit-dependencies.mjs`, `npm ci`, `npx tsc --noEmit`, `npm run build` in a safe environment. Check GitHub Actions on the final head. Treat candidate packages as review-only; inspect package licences and hosting terms manually before commercial launch.
- **Status:** P3-10a implementation and CI attempt complete; full P3-10 remains open, no production or functional claims.

## P2-05a — Safe Supabase PKCE auth callback redirects
- **Draft PR:** https://github.com/nikkushrivastava0-a11y/leadflow-ai/pull/46
- **Files:** `src/lib/auth-callback-origin.ts`, `src/app/auth/callback/route.ts`, `src/app/auth/auth-code-error/page.tsx`, `tests/auth-callback-origin.test.mjs`, CI and `docs/P2_05A_AUTH_CALLBACK_REDIRECTS.md`.
- **Behavior:** Restricts auth redirects to server-controlled canonical/Vercel/local development origins, never arbitrary Host header or `next` query parameters; only redirects to dashboard if PKCE exchange returns a user+session. Failure goes to a noindex retry page with no-store and no-referrer headers. Does not log codes or tokens.
- **Verification:** GitHub Actions https://github.com/nikkushrivastava0-a11y/leadflow-ai/actions/runs/42596932092 **SUCCESS** (pure hostile-host/query tests, `npm ci`, `npx tsc --noEmit`, `npm run build`). Earlier Vercel READY was for an earlier commit, so no final-head Vercel preview/browser QA confirmed.
- **Remaining:** Actual configured Supabase PKCE redirect flow/session cookie continuity on the real allowed domain and review of OAuth configuration. Does not fix `clients` RLS or onboarding.
- **Status:** Draft implementation and synthetic full CI verified; full P2-05 remains OPEN.

## P1-11a — Signup email-verification truthfulness
- **Draft PR:** https://github.com/nikkushrivastava0-a11y/leadflow-ai/pull/47
- **Files:** `src/lib/auth-submission-outcome.ts`, `src/app/login/page.tsx`, `tests/auth-submission-outcome.test.mjs`, CI and `docs/P1_11A_SIGNUP_VERIFICATION.md`.
- **Behavior:** Distinguishes Supabase signup with `session: null` from a real login; shows generic accessible verification notice and stays on sign-in when confirmation pending. Signin requires both user and session, errors are handled, password state cleared. A valid Auth session does not imply a provisioned business.
- **Verification:** GitHub Actions https://github.com/nikkushrivastava0-a11y/leadflow-ai/actions/runs/42597415041 **SUCCESS** (synthetic tests, TS typecheck, Next build). No real Auth users created or staging email testing; final Vercel preview not confirmed.
- **Remaining:** Auth-linked client profile provisioning, live `clients` owner RLS SELECT, verified email confirmation page in staging, two-business tenant isolation; full P1-11 remains OPEN.
- **Status:** Safe UX correction verified in draft only.

## P0-13 — Confirmed CRM lead deletion
- **Draft PR:** https://github.com/nikkushrivastava0-a11y/leadflow-ai/pull/48
- **Files:** `src/lib/lead-delete-guard.ts`, `src/lib/actions.ts`, `src/components/leads-table.tsx`, `tests/lead-delete-guard.test.mjs`, CI and `docs/P0_13_CONFIRMED_LEAD_DELETE.md`.
- **Behavior:** Validates UUID, requires exactly one row returned by Supabase `.delete().select("id")` before claiming success, masks tenant existence, adds explicit native confirmation and blocks repeat clicks. Prevents the prior false success when RLS silently affects zero rows.
- **Verification:** GitHub Actions https://github.com/nikkushrivastava0-a11y/leadflow-ai/actions/runs/42597949513 **SUCCESS** (zero-row/no-error unit cases, `npm ci`, TypeScript and Next build). No real customer data deletion, Vercel final-head verification or browser QA.
- **Conflict:** CRM search PR #44 also edits `src/components/leads-table.tsx`. They require a reviewed merge/rebase; neither merged.
- **Remaining:** Production DELETE policy is still missing under RLS, current `user_id` filter excludes legitimate NULL-user_id public leads; update only with reviewed owner migration. No actual deletion was tested in real database.
- **Status:** Draft code + synthetic CI complete, production action remains blocked.

