# LeadFlow AI

LeadFlow AI is an **early-stage enquiry tracking app for local businesses**. The current codebase includes a shareable public enquiry form, a Supabase-backed lead dashboard, owner login, manual lead entry, experimental scoring, and an **incomplete** Razorpay checkout integration.

**Product status: not customer-ready.** Important reliability, database, tenant-isolation and payment-verification work remains in draft pull requests. Do not upload real customer enquiries or accept paid upgrades until those release gates pass. No revenue or customer count is claimed by this README.

Repository: https://github.com/nikkushrivastava0-a11y/leadflow-ai

## Who it is for

Initial discovery segment: independent coaching centres, gyms and similar local businesses that manually track new enquiries and phone follow-ups. Coaching centres in Noida / Greater Noida are the first buyer **hypothesis**, not proven product-market fit.

The product's intended core promise is simple: collect an enquiry, see it under the correct business, and mark its follow-up status. It does **not** automatically call leads, send WhatsApp messages or guarantee more admissions/sales.

## Technology

| Layer | Current code |
|---|---|
| Application | Next.js App Router 16.2.9, React 19, TypeScript |
| Styling | Tailwind CSS 4, shadcn/Radix components |
| Authentication and data | Supabase Auth, Postgres via Supabase client |
| Experimental lead priority | Gemini API (the original main branch uses retired `gemini-2.0-flash`) |
| Payments | Razorpay order creation, **not yet verified fulfillment** |
| Deployment | Vercel-connected repository |

The full list of installed dependencies and supported scripts is in [package.json](package.json).

## Routes you can find in the source

- `/` — landing page. Marketing copy should be reviewed before launch.
- `/login` — owner sign-in/sign-up via Supabase Auth.
- `/dashboard` — leads table, aggregate counters and shareable form URL.
- `/form/[slug]` — public enquiry form for a specific business.
- `/form` — currently a defective static route on main; safe redirect proposed in draft PR #12.
- `/api/checkout` — creates an order; **do not enable real payments** until authentication, server-side verification and durable entitlement tracking are complete.
- `/auth/callback` — Auth callback.

An experimental 3D founder Agent Studio is also proposed in **draft PR #10**; it is not on `main`.

## Local development (Windows PowerShell)

You need a recent Node.js installation supported by Next.js 16, npm and a separately configured **test** Supabase project. Do not use production customer credentials in development.

```powershell
git clone https://github.com/nikkushrivastava0-a11y/leadflow-ai.git
cd leadflow-ai
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Then open `http://localhost:3000`.

**Important:** `.env.example` is not yet on `main`; it is proposed in **draft PR #22**. Until merged, create `.env.local` manually with only the variable *names* below, filling real values privately from your approved staging project.

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
GEMINI_API_KEY=
NEXT_PUBLIC_RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
```

- Supabase publishable/anon keys may be browser-accessible, but **RLS must protect every data row**. Never put service-role or database admin keys in browser variables.
- `GEMINI_API_KEY` and `RAZORPAY_KEY_SECRET` must remain server-only; do not prefix them with `NEXT_PUBLIC_`.
- Do not place real keys into commits, PRs, issues, public screenshots, terminal logs or support chats.
- Main currently tries a shut-down Gemini model; a configurable stable model with labelled rule-based fallback is proposed in **draft PR #16**, with further privacy improvements in **draft PR #29**.
- Missing a live model API key is preferable to exposing one. Never use an unverified AI score as a sales promise.

## Engineering verification

```powershell
npx tsc --noEmit
npm run lint
npm run build
```

`npm run lint` on the historical `main` snapshot has **five known errors**. A separate **draft PR #18** establishes quality CI and fixes them; it passed typecheck/lint/build in GitHub Actions, but has **not been merged**. Do not assume `main` already passes all checks. Unit test scripts are being introduced in isolated draft PRs.

A Vercel build marked **READY** proves that the app compiled and preview deployment completed. It does **not** prove login works, form submissions save, RLS is correct, payment captured, or mobile UX was visually tested.

## Database notes and security gates

The main branch references two tables:

- `clients`: uses `owner_email` to find the business `slug`.
- `leads`: uses `client_slug` in the dashboard/public form and `user_id` in several manual actions.

This mixed ownership mapping is an acknowledged defect (see **draft PR #14** for proposed code alignment). **Database schema, permissions and RLS have not been verified.** The connected Supabase project was last observed as `INACTIVE`, so the app may not work even if a preview build succeeds.

Before onboarding anyone with real data:

1. Restore or create a nonproduction staging database, with founder approval and no real client data.
2. Inspect actual table schema and `anon`/`authenticated` privileges before proposing changes.
3. Prove two different business accounts cannot read, write, update or delete each other's leads.
4. Test valid and invalid public forms, error states, spam prevention, and retries.
5. Confirm lead status editing and onboarding with synthetic example data.
6. Confirm privacy notices, data export/deletion expectations and backup procedures.

Avoid broad RLS policies or service-role shortcuts that undermine tenant isolation.

## Payment safety

Current main checkout is **not a functioning paid subscription system**. A frontend callback is not enough to verify a real payment.

A safe paid flow needs authenticated order creation, order-to-owner mapping, verified signature, captured amount/currency confirmation, replay/idempotent webhooks, persistent entitlement status, refunds/cancellation handling and transaction receipts. Auth and paused CTA work are proposed in **draft PRs #13 and #15**; signature primitives in **draft PR #27** are not the full flow.

Do not charge real customers through the current app.

## Engineering and growth planning

- **Issue board:** [GitHub Issues](https://github.com/nikkushrivastava0-a11y/leadflow-ai/issues) lists roles and actionable improvements.
- **Tracking documents:** `TASKS.md`, `PROGRESS.md`, `BLOCKERS.md` are maintained on **draft tracking PR #11**, not yet merged into main.
- **Founder roles:** CEO (priorities), CTO (reliability/security), Marketing (positioning), Sales (conversations), Product (customer workflow), CFO (cash and pricing).
- **Growth target:** first paying customers in ~60 days, no guarantee. Proposed coaching-centre pricing and outreach scripts exist in separate draft PRs, not active product offers.

The founder prefers **human-crafted, non-template-looking UI with meaningful 3D only when it serves interaction**. The full visual contract lives in **draft PR #10** at `docs/DESIGN_REFERENCE_NOTES.md`, and should be reviewed before redesigning public pages.

## Contribution rules

1. Read [AGENTS.md](AGENTS.md) first; this Next.js version differs from older conventions.
2. Use one small branch and **draft PR** per task. Never push directly to main or production without explicit founder approval.
3. Record current branch/commit, reproducible issue, precise change, automated test output and remaining assumptions.
4. Avoid unreviewed database changes, keys in source, public personal data, silent AI fallbacks, fake testimonials and unsolicited message sending.
5. Prefer reliable enquiry capture and owner follow-up over complicated multi-agent infrastructure until actual buyers confirm value.

## Current launch limitations (do not hide)

Supabase project accessibility, public insert policy, cross-tenant isolation, payment fulfillment, email confirmation/onboarding, form anti-spam, mobile QA and supported-model configuration all require review. Several fixes exist **only in draft PRs**, meaning production and main are still unchanged.

See the connected GitHub PRs for the latest verified build/test status before calling any of these resolved.
