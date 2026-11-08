# LeadFlow AI — 60-day engineering + revenue task queue

Started: 2026-11-09 (Asia/Kolkata)
Source baseline: `main` commit `c39a0ef` (2026-06-21).
Operating budget: under INR 5,000/month. Goal: first paying customers in 60 days, no guarantee.
Workflow: one **independent draft PR per implementation task**, no production/main writes. This tracking PR contains only TASKS/PROGRESS/BLOCKERS and will be maintained separately.

## Working assumptions and safety
- Initial buyer hypothesis: coaching-centre owner or admissions team, Noida / Greater Noida. This must be validated through discovery calls.
- Customer-facing scope already present in main: enquiry form, CRM dashboard, lead scoring, login and Razorpay order creation. Lead finder, site generator and pitch writer are proposals, **not currently implemented**.
- Current main `AGENTS.md` only contains Next.js guidance; `docs/DESIGN_REFERENCE_NOTES.md` is NOT on main. Follow the more specific design requirements from existing draft Agent Studio PR #10 (premium, intentional, useful 3D; no generic AI card-grid, false metrics or stock templates), without implying those changes are merged.
- Test claims distinguish: code review, preview build, functional test. Build READY alone does not mean fully tested.
- Supabase project previously reported INACTIVE; schema/RLS unavailable. No customer data or payment changes until verified.
- P0 means security/functional launch blockers. No client outreach without user approval, no money spending, no main merge.
- Progress lives on this tracking branch until reviewed and merged. Independent PRs do not silently depend on unmerged files.

## P0 — bugs, security, broken builds, deployment
- [x] **P0-01** Remove broken static `/form` route that assumes a nonexistent `slug`; redirect to a safe page.
- [x] **P0-02** Require authenticated user and safe error response before Razorpay order creation.
- [ ] **P0-03** Verify Razorpay payment signature, amount, order ownership and paid status server-side before enabling a Pro plan.
- [x] **P0-03a** Implement and test checkout/webhook HMAC authenticity primitives (partial; P0-03 remains blocked).
- [x] **P0-04** Replace misleading browser-only payment-success toast with verified server confirmation.
- [ ] **P0-05** Restore connected Supabase availability and inspect actual `leads`/`clients` schema, RLS and privileges.
- [x] **P0-06** Resolve mismatch between manual `user_id` lead writes and dashboard `client_slug` queries.
- [x] **P0-07** Validate public form fields and ensure submitted slug belongs to a real client before insert.
- [x] **P0-08** Add genuine request throttling, spam resistance and duplicate handling to public enquiry path.
- [x] **P0-09** Display public form submission failures instead of silently doing nothing.
- [x] **P0-10** Remove hard-coded retired Gemini model; configure an actually available model with timeouts.
- [x] **P0-11** Model scoring: schema validation, prompt-injection isolation and truthful unavailable state.
- [x] **P0-12** Add basic PR checks and verify builds and deployment preview gate.

## P1 — revenue-producing product features
- [x] **P1-01** Inline editable CRM lead stage with success/error feedback.
- [ ] **P1-02** Follow-up due dates, contact notes and workflow reminders.
- [ ] **P1-03** Lead qualification pipeline consistent for public and manual leads.
- [ ] **P1-04** Ethical local lead-finder research assistant using publicly available business information; no mass scraping or unsolicited auto-send.
- [x] **P1-04a** Research 13 verifiable public Greater Noida coaching businesses for founder-reviewed discovery (subtask only, no automated lead finder).
- [ ] **P1-05** Focused coaching-centre landing/site generator prototype based on real approved copy.
- [ ] **P1-06** Contextual pitch-writer that outputs drafts for human approval.
- [ ] **P1-07** CRM search, filters, sorting and pagination.
- [ ] **P1-08** QR/link-sharing for an individual business enquiry form.
- [ ] **P1-09** Safe UPI/checkout flow and invoicing plan with reconciled paid activation.
- [ ] **P1-10** Synthetic, believable coaching-centre sales demo (no fake proof).
- [ ] **P1-11** Verified owner onboarding and automatic client profile provisioning.

## P2 — design quality, SEO, mobile, observability
- [ ] **P2-01** Audit Agent Studio PR #10 with 3D usability and real browser checks; do not merge unverified visuals.
- [ ] **P2-02** Design a non-generic coaching-centre landing page grounded in visual references.
- [ ] **P2-03** Mobile responsive QA for form and CRM, 390px to desktop.
- [ ] **P2-04** Meaningful titles/descriptions, sitemap, robots and truthful social preview.
- [ ] **P2-05** Verify HTTPS/deployment domains; enforce safe redirect policy.
- [ ] **P2-06** Privacy-respecting conversion analytics and consent handling.
- [ ] **P2-07** Accessibility and keyboard checks, contrast and reduced motion.
- [ ] **P2-08** Form trust details, privacy policy, FAQ, realistic copy, no fake testimonials.

## P3 — engineering hygiene, docs and go-to-market
- [ ] **P3-01** Actual README: setup, architecture, support model and known limits.
- [x] **P3-02** Safe `.env.example` with variable names only, no credentials.
- [ ] **P3-03** Unit tests for status validation, input validation and lead score parsing.
- [ ] **P3-04** Integration tests for client data isolation and public form submission.
- [ ] **P3-05** E2E tests for login, onboarding, lead add/edit, payment demo.
- [x] **P3-06** Pricing and trial policy with clearly labelled proposed tiers.
- [x] **P3-07** Founder-reviewed LinkedIn, email and WhatsApp outreach drafts; never send automatically.
- [x] **P3-08** Demo playbook, discovery questionnaire, objections and follow-up flow.
- [x] **P3-09** Weekly cash / MRR / costs scorecard based on verified figures.
- [ ] **P3-10** Dependency audit, remove unused code and verify licence/commercial hosting.

## Completion rule
Mark a task done **only** when implementation is pushed to its own draft PR and build verification has been attempted and recorded in PROGRESS.md. Explain clearly if build passed but functional testing is still pending.
