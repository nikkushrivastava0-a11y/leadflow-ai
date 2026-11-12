# Razorpay test-mode backend implementation

Status: implemented but OFF by default; reviewed 2026-11-13. No provider requests or hosted SQL were performed during implementation. This is not live billing acceptance.

## Executable backend

- `POST /api/billing/checkout` accepts exactly `{ "plan": "<server-configured-test-plan>" }`. It resolves the verified Supabase business owner, rejects cross-origin cookie-auth requests, obtains price/currency/duration only from server configuration, consumes a durable shared checkout-attempt reservation before any provider call, creates an official Razorpay test order, validates its response, and durably stores owner/order/plan mapping before returning the order to the browser. A failed ledger write cannot return checkout success. Provider order creation is never automatically retried: an uncertain provider response or failed ledger save requires reconciliation rather than a blind retry/payment.
- `POST /api/billing/verify` accepts `ledgerOrderId`, `paymentId`, `signature`. It resolves the owner and stored order first, computes checkout HMAC using the **stored** provider order ID, fetches the current provider payment, and requires matching payment/order/amount/currency plus `captured=true`, `status=captured`, and zero refunded amount. Only then does one database transaction write the event, order state and test entitlement.
- `POST /api/billing/webhook` reads at most 64 KiB as raw bytes and verifies the separate webhook HMAC before JSON parsing. It requires `x-razorpay-event-id`, fetches authoritative payment state using the test API, and processes captured payments, confirmed partial/full refunds, and signed adverse dispute events. Authorized/failed events never grant access; won/closed disputes never automatically regrant access.
- The provider adapter calls only official `POST /v1/orders` and `GET /v1/payments/:id` with test keys. It has a 4.5-second timeout and makes no capture, refund, subscription, live-key or automated retry call. Fixtures exist only in tests via dependency injection.
- Errors are generic, carry `Cache-Control: no-store`, and never return credentials or raw provider/database responses.

The existing `/api/checkout` route still returns 503 and the existing upgrade button is still disabled. No browser Razorpay script or user payment UI is enabled. Test entitlements are clearly separated in `billing_test_*`; no product paid-access consumer reads these tables, and no live entitlement can be granted by this code.

## Durable ledger and concurrency

`security/proposals/billing-test-ledger.sql` is an unapplied proposal, protected by the explicit `leadflow.billing_test_migration='APPROVED_LOCAL_TEST'` sentinel. It requires the reviewed `clients.owner_user_id`, `clients.slug` and `auth.users` schema. It creates only:

- `billing_test_checkout_attempts`: service-only durable reservations with a per-owner advisory transaction lock and 10-attempt/hour limit, consumed before provider work. Failed attempts remain counted.
- `billing_test_orders`: unique provider order and payment IDs, immutable stored amount/currency/duration, owner/business mapping and `mode='test'` constraint.
- `billing_test_events`: unique event IDs plus SHA-256 payload binding.
- `billing_test_entitlements`: one entitlement per order and payment, fixed initial expiry and optional irreversible revocation timestamp.

RLS allows owners to read only their own order/entitlement rows while their business mapping still matches; anonymous access and all owner writes are denied. Events have no client read policy. Mutation RPCs are **SECURITY INVOKER**, with EXECUTE revoked from PUBLIC/anon/authenticated and granted only to service_role; no SECURITY DEFINER bypass exists. The service key stays in the server runtime and is never combined with user cookies/JWTs.

Processing locks the stored order row. Event-ID/hash collisions, amount/currency mismatches, second payments and payment reuse across orders abort. Event insertion, order update and entitlement insertion/revocation share the RPC transaction. A failure rolls all of them back so the same event can retry. Different events for the same payment cannot extend expiry. Refund/dispute state is an irreversible tombstone, including when it arrives before capture; delayed captured events cannot restore access. Any partial refund conservatively revokes the full test entitlement. Subscription renewal/cancellation does not exist here; test access is a finite one-time interval, never a permanent subscription.

The SQL also checks current business ownership before reserving checkout, storing an order or processing a capture. An atomic owner-scoped advisory lock enforces 10 checkout attempts/hour before provider creation; valid orders require a matching durable reservation. Failed attempts remain counted rather than releasing a bypassable throttle.

## Configuration — never put secrets in NEXT_PUBLIC variables

All conditions must pass before a new billing endpoint does auth/database/provider work:

1. `LEADFLOW_BILLING_MODE=razorpay-test` (no live mode is implemented).
2. `RAZORPAY_KEY_ID` matching `rzp_test_*`, `RAZORPAY_KEY_SECRET` at least 16 characters, and separate `RAZORPAY_WEBHOOK_SECRET` at least 24 characters. Live keys are rejected.
3. `LEADFLOW_TEST_PLAN_CATALOGUE` is server-only JSON mapping plan IDs to integer smallest-unit `amount`, `currency:"INR"`, and integer `durationDays`. No default price or founder-approved real offer is implied. Invalid/empty catalogue disables billing. Values are bounded: amount 100–10,000,000; duration 1–366 days.
4. Normal Supabase session URL/key plus server-only modern `SUPABASE_SECRET_KEY`, an HTTPS `*.supabase.co` origin, and the explicitly reviewed test-ledger schema.

Do not set these on production under this change. Credentials, hosted migration and actual Razorpay test dashboard acceptance need separate approval. Keep the ordinary paid CTA disabled throughout test acceptance.

## Verification performed without charges

- `node --experimental-strip-types --test tests/billing-test-mode.test.ts`: core/transport fixtures verify disabled/live-key gates, authenticated owner mapping, no client price override, stored-order HMAC, captured/refund-free provider verification, amount/currency/order/payment mismatch denial, raw-byte HMAC, malformed payload denial, refund/dispute behavior and transport/persistence errors.
- `node --test tests/billing-runtime.test.mjs`: actual new server handler is executed through TypeScript transpilation; default-disabled checkout/verify/webhook and attempted live-key activation return 503 before touching auth/provider/database.
- `LEADFLOW_SYNTHETIC_ONLY=YES bash security/tests/billing-test-ledger.sh`: empty loopback disposable PostgreSQL only. Exercises actual proposed SQL, two-owner RLS, anonymous/owner write denial, service-only RPC, **12 concurrent duplicate-event sessions**, concurrent pre-provider checkout throttling, fixed expiry across distinct events, event hash collisions, mismatched amount/currency/payment, payment reuse, refunds before/after capture, forced entitlement-write failure with atomic rollback and same-event retry.
- All 19 billing checks pass (12 core/test-transport, 4 new runtime default/live-key gates, 3 existing paused-checkout regressions). TypeScript and ESLint pass. `next build --webpack` passes with synthetic build-only public Supabase values and lists all three new dynamic billing routes. Default Turbopack build in this worktree rejected its external node_modules symlink before compilation; the integration worktree should run its normal build with real local dependencies. No actual payment/provider API request is needed to build.

The SQL test requires `psql` and an empty database with PGHOST=127.0.0.1 or localhost; it refuses a nonempty database. It creates only synthetic identities. Do not point it at a hosted project.

## Remaining activation gates

1. Define the operational reconciliation process for uncertain order-create/save failures; the implementation deliberately never auto-retries order creation. Review the conservative 10-attempt/hour test limit.
2. Review/apply the proposal only to an approved free test database and run real Supabase owner JWT + test billing RPC end-to-end verification. The current runtime deliberately requires hosted modern-key semantics, so local direct SQL tests do not constitute that HTTP/session acceptance.
3. Configure actual Razorpay **test** credentials/webhook and approved server test catalogue privately, then validate authentic test-dashboard capture/webhook delivery, signature rotation/retries and deployed response time. No such API test was performed here.
4. Confirm business/product rules for refunds/disputes/expiry and define a separately reviewed live billing implementation; do not reuse test entitlements as live paid access. No live-key mode, live pricing or public checkout is authorized by this work.

Rollback of the code leaves old checkout disabled. For an applied test schema, first unset the test billing mode and stop test webhook delivery, preserve ledger/events for audit, revoke service_role mutation EXECUTE grants, and verify clients cannot mutate records. Do not drop populated ledgers or erase event history as an automated rollback.

## Official references checked

- https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps — server-created orders, stored-order checkout signature and captured-payment confirmation.
- https://razorpay.com/docs/webhooks/validate-test — raw-body HMAC, event ID deduplication and out-of-order delivery.
- https://razorpay.com/docs/webhooks/disputes — signed dispute events.
- https://supabase.com/docs/guides/database/functions — invocation security and function permissions.
- https://supabase.com/docs/guides/database/postgres/row-level-security — owner policies and service-role isolation.
- https://supabase.com/changelog.md — current CLI/schema guidance inspected; no CLI migration command is run by this implementation.
