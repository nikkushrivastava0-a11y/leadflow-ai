# Billing readiness — customer release candidate

Reviewed 2026-11-13 (Asia/Kolkata), from candidate source based on PR #54 (`c275277`).

## Current result

**Paid upgrades remain unavailable. No payment-ready billing implementation is claimed.**

- `src/app/api/checkout/route.ts` always returns HTTP 503, `{ "error": "Paid upgrades are not available yet." }`, and `Cache-Control: no-store`.
- The handler imports only `next/server`. It does not create an order, contact Razorpay, write an entitlement, or use provider credentials.
- `src/components/upgrade-button.tsx` renders a disabled `type="button"` control with a truthful unavailable label. There is no browser success callback or provider script in the candidate source.
- No capture-verification endpoint, webhook handler, persistent order ledger or durable entitlement implementation exists in this candidate. The independent HMAC helper branch is not an end-to-end payment feature and must not be represented as one.

A free/manual pilot can be evaluated with billing paused, subject to the separate data isolation and customer journey launch gates. Automated paid upgrades cannot be enabled by changing the button or checkout route alone.

## Offline verification performed

Persistent regression: `node --test tests/billing-disabled.test.mjs` (3 passing checks). Executed the real checkout route after TypeScript transpilation, using the installed real `next/server` response implementation. A restrictive module loader allowed only that import, so provider/database imports would fail the check. Both an unauthenticated request and a synthetic bearer-auth request containing arbitrary amount/plan/payment fields returned HTTP 503, `no-store`, and the exact unavailable response. A third check supplies synthetic provider environment variables and apparent billing feature flags and confirms they cannot override the pause. A fetch trap and restrictive imports reject upstream work. No network request, real provider credential, customer record or payment was used.

This verifies the paused handler behavior. It does not verify an authenticated session, Razorpay payment capture or production deployment behavior. Repeat a harmless checkout POST on the deployed candidate before release; do not send live credentials or payment data.

## Required before enabling paid upgrades

1. Define a server-controlled product/plan catalogue and exact price/currency. Client amounts or plan claims must never determine entitlement value.
2. Require a verified server-side session and business owner scope. Create a provider order only after storing a durable order-to-owner/business mapping with expected plan, amount and currency. Deny cross-business access to the order ledger.
3. Validate checkout signatures against the stored order ID using the server secret. An arbitrary order ID supplied by the browser must not become the trusted order identity.
4. Confirm the provider payment belongs to that exact stored order, is captured, and matches expected amount/currency. Browser callbacks and signatures alone do not establish capture.
5. Verify webhook HMAC over the unmodified raw request body, handle invalid/missing signatures, and validate event schema before processing. Do not trust a signature for the browser payment tuple as a webhook signature.
6. Persist provider event IDs and payment IDs under unique constraints. Apply entitlement and mark processed atomically so duplicate/out-of-order events, concurrent deliveries and retries cannot grant multiple or incorrect entitlements. Store failed processing safely so retries remain possible.
7. Define refunds, disputes, cancellations and subscription expiry behavior; do not grant a permanent paid state based on a transient client signal.
8. Verify only with provider test mode/offline fixtures: unauthenticated caller, wrong owner, tampered signature, wrong amount/currency/order, authorized-but-not-captured payment, replay, concurrent webhook, persistence failure/retry and out-of-order events.
9. Obtain separate approval for provider configuration, live billing activation and any real charge. No new paid resource or provider service is enabled by this candidate.

Keep checkout HTTP 503 and the UI disabled until these gates have concrete evidence. Billing code from unrelated draft branches should not bypass this pause.
