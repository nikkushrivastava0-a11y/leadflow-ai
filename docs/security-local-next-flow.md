# Real Next.js customer-flow HTTP rehearsal

`security/tests/next-app-flow.mjs` is an opt-in extension of the pinned official Auth/PostgREST runner. Run the normal fixture with `LEADFLOW_NEXT_FLOW=YES`. It builds the actual checked-out Next.js application using the installed Next 16 Webpack builder, starts `next start` on loopback, and tests real HTTP requests. It does not run browser automation or replace the application database client, owner scope, proxy, server actions or database policies with mocks.

## Run

Start a fresh disposable loopback PostgreSQL instance, create a new empty database with the required `leadflow_jwt_` prefix, and supply the pinned official binaries as described in `security-local-auth-jwt.md`. In the repository root with locked packages installed:

```bash
LEADFLOW_SYNTHETIC_ONLY=YES \
LEADFLOW_NEXT_FLOW=YES \
PGHOST=127.0.0.1 PGPORT=5432 PGUSER=postgres PGDATABASE=leadflow_jwt_next \
LEADFLOW_AUTH_BIN=/absolute/path/to/auth \
LEADFLOW_POSTGREST_BIN=/absolute/path/to/postgrest \
node security/tests/local-auth-api.mjs
```

The database must be empty. The fixture's existing schema guards and executable hashes remain enforced. Optional loopback ports are `LEADFLOW_AUTH_PORT` (55440), `LEADFLOW_REST_PORT` (55441), `LEADFLOW_GATEWAY_PORT` (55442) and `LEADFLOW_NEXT_PORT` (55443). Allocate distinct unused ports. Run in a disposable checkout: the production compile writes `.next` with synthetic public URL/API-key configuration, so that build must never be uploaded as a hosted release.

The in-process gateway only routes `/auth/v1/*` to official Auth and `/rest/v1/*` to official PostgREST. It requires the generated synthetic anon API key. Real Auth validates users and issues/refreshes JWTs, PostgREST validates signatures/audience/expiry, and the reviewed SQL policies enforce ownership. The gateway does not implement user authorization or simulate query responses. It is not Kong and does not certify hosted platform gateway behavior.

No production provider variables are inherited by the application. Gemini, public writer, Redis, billing and email secrets are absent. Infrastructure proxy/certificate settings can be inherited for a normal font download during compilation; TLS verification is not disabled. Logs are drained privately; named pass/fail checks contain no cookies or tokens. Build execution has a five-minute bound. Child services and the gateway close in `finally`; the caller must stop its PostgreSQL server.

## Verified result

Passed on 2026-11-13 IST against a fresh disposable PostgreSQL 17.11 database, pinned official Auth v2.197.0/PostgREST v16.5 and an actual Next.js 16.2.9 production build of the candidate source. All named checks below passed. No hosted writes, customer records, email, paid API requests or new resources were used.

## Scope

The runner verifies:

1. Actual production compile, then unauthenticated dashboard redirect.
2. Standard `@supabase/ssr` session cookies created by SDK password login against real Auth; two owners' server-rendered dashboards remain separate.
3. Local auto-confirmed SDK signup cannot claim a workspace: the actual dashboard shows pending access without exposing existing leads. No email is sent.
4. An expired access JWT in a standard SSR cookie refreshes through real Auth in the actual Next Proxy; refreshed cookies reach the HTTP response. An invalid refresh token redirects to login.
5. The exact build manifest supplies Server Action IDs. Real HTTP action POSTs execute owner-scoped status and follow-up updates, persisted reload and clearing. Cross-owner status/follow-up/delete return errors and cannot change the other owner's rows.
6. Actual manual lead creation assigns the verified owner workspace; dashboard search/status filters work, pagination uses all 23 matching synthetic rows, own deletion persists, and AI fallback is labelled.
7. Cross-origin Server Action POST is rejected without modifying the row.
8. Authenticated `/login` redirects to dashboard. SDK sign-out clears standard SSR cookies and a subsequent actual dashboard request redirects to login.

Fixture UUIDs use valid version-4 syntax because the actual actions intentionally reject malformed UUID versions. `created_at` and `email_sent` columns are added only to the disposable fixture to match dashboard presentation requirements; no production schema is changed.

## Limits

This is actual local Next HTTP + real official Auth/JWT/PostgREST/RLS verification. It is **not** a browser test: client event handlers, visual/mobile behavior, PKCE clicks and email-link delivery are not exercised. SDK signup/login/sign-out calls are tested directly, while the resulting session cookies are consumed by the actual server-rendered app. Public enquiry submission/provider configuration remains a separate test; no public secret-key URL validation was weakened to make this loopback setup work. Hosted redirect configuration, production schema/owner decisions, the 39 real unresolved records, rollout/rollback approval and post-deployment verification remain separate.


## Optional actual public intake action

Set `LEADFLOW_PUBLIC_NEXT_FLOW=YES` alongside the existing Next-flow opt-in to rehearse the real native multipart public action, server-only writer, PostgreSQL guard and signed receipt with a CA-verified fixture HTTPS endpoint. See `security-local-next-public-flow.md`. This leaves production URL validation unchanged and uses no hosted secret or external provider.
