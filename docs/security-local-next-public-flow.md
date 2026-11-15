# Actual local Next public enquiry action rehearsal

Enable both `LEADFLOW_NEXT_FLOW=YES` and `LEADFLOW_PUBLIC_NEXT_FLOW=YES` on the fresh-database runner from `security-local-next-flow.md`. OpenSSL is additionally required. `LEADFLOW_PUBLIC_TLS_PORT` defaults to 55444 and must be distinct from the other local service ports.

This opt-in fixture runs the actual public route, its generated bound Server Action, public writer client, PostgreSQL guard provider, receipt implementation and owner dashboard. It does not relax production URL/key validation or stub the application guard.

## Verified result

Passed 2026-11-13 IST on a fresh disposable PostgreSQL database with official Auth v2.197.0/PostgREST v16.5 and the actual Next.js 16.2.9 production build including the PostgreSQL guard candidate. Every HTTP check below and the preceding owner/session/action checks passed. No hosted or paid service was used.

## Transport and identity boundary

The fixture creates a temporary one-day test CA/certificate with `synthetic.supabase.co` in its SAN, then starts a loopback HTTPS gateway. Only that exact fake hostname maps to loopback in a child-process DNS preload. The Next process uses the narrow test CA through `NODE_EXTRA_CA_CERTS`; TLS certificate and hostname verification remain enabled. Existing proxy CA configuration is retained when present. No global TLS bypass or production code hook is used.

The Next application receives a syntactically valid, generated **fake** `sb_secret_*` writer key. Only the loopback fixture gateway accepts it and translates it into a short-lived JWT for the local fixture's `service_role`. Official PostgREST verifies that signed token and executes the actual SQL RPC. This mirrors the secret-key gateway boundary; it does not certify hosted Kong/API-key configuration. The role and all data exist only in the guarded disposable database. No real Supabase secret is read.

For test-side SDK login, the existing in-process HTTP gateway reaches the same official Auth service and yields standard SDK cookies for the configured fake HTTPS hostname. The actual Next server's Auth/Data API/public-writer calls go through the CA-verified HTTPS endpoint. Certificates, generated secrets, sessions and preload files stay out of Git and are removed during normal cleanup.

## HTTP checks

The fixture reads the actual server-rendered form's hidden `$ACTION_*` controls and sends native multipart form POSTs. Therefore the generated action ID, encrypted bound closure arguments, Next action decoding, server-side validation and redirect handling are exercised rather than calling a reimplementation.

Checks include:

- Valid enquiry saves exactly one NULL-user public lead for the verified business, is visible in owner A's actual dashboard and hidden from B.
- A protected signed receipt cookie confirms the recent save; a forged query string and cross-business receipt cannot confirm it.
- Duplicate, honeypot, invalid-contact and unknown-business submissions do not save extra rows.
- A single fixture gateway upstream-write failure produces a visible save-error redirect. The actual PostgreSQL reservation is released; the same details can then retry successfully.
- The fake writer key is absent from the rendered public form.

Only the upstream failure case is injected by the gateway. Successful inserts, shared reservation/complete/release RPCs, RLS and owner reads run against the real local PostgreSQL/PostgREST implementation.

## Remaining limits

No browser automation, visual/mobile interaction or hosted provider behavior is certified. Native multipart HTTP, receipt attributes/signatures and dashboard rendering are tested; browser event handlers, real HTTPS cookie transport in a browser, email delivery, production ownership decisions and live rollout remain separate. The test production build contains a fake API URL/key and must never be deployed as a hosted release.
