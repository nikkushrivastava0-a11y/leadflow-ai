# Local real Auth JWT → PostgREST → RLS verification

Verified 2026-11-12 UTC / 2026-11-13 IST on free disposable PostgreSQL 17.11. The optional runner is `security/tests/local-auth-api.mjs` (deliberately not a `*.test.mjs` glob). It runs official standalone Supabase Auth and PostgREST binaries on loopback. No Docker, hosted staging, paid services, real customer records or SMTP were used.

## Version and provenance

| Component | Official release | Archive SHA256 | Executable SHA256 |
| --- | --- | --- | --- |
| Supabase Auth | `v2.197.0`, `auth-v2.197.0-amd64.tar.xz` | `b5c2991d1df760c9b099c1c2395a94bd1c2f83ed58901934921997179dc9f7ea` | `c66b5efc816ccf3e13c24022bdefd5c6a9bea1fd1a1aeb9c586e1279c75a6306` |
| PostgREST | `v16.5`, `postgrest-v16.5-linux-static-x86-64.tar.xz` | `5099e7ada38f9f6846cd87c14c5f158b7c165f1e9959665ad412e61f4dceba95` | `cc218dc89e882ae2b828b3e8d08a1cffd29f4fa126a0869b038ac9e3a12c357d` |

Exact official URLs:

- https://github.com/supabase/auth/releases/download/v2.197.0/auth-v2.197.0-amd64.tar.xz
- https://github.com/PostgREST/postgrest/releases/download/v16.5/postgrest-v16.5-linux-static-x86-64.tar.xz

Archive hashes above match the SHA256 asset digests returned by the official GitHub release API. The runner additionally verifies the extracted executable hashes before spawning them. No downloaded binaries, database dumps, passwords, provider secrets or tokens belong in Git.

Official setup references consulted:

- https://github.com/supabase/auth/tree/v2.197.0 — standalone Auth and embedded migrations.
- https://github.com/supabase/auth/blob/v2.197.0/example.env — local configuration; mailer auto-confirm.
- https://github.com/supabase/auth/blob/v2.197.0/init_postgres.sh — Auth requires `auth` search_path; migration grants refer to a `postgres` role.
- https://docs.postgrest.org/en/v16/references/configuration.html — database role, schema, JWT and server binding configuration.

## What passed

1. Official Auth embedded migrations created real Auth tables and official `auth.uid()`; no mocked Auth function was installed.
2. Two fake `@example.test` accounts signed up, password logged in and passed `/user` validation. Auto-confirm is enabled for this local fixture only, with no SMTP host.
3. Auth-issued bearer JWTs passed through the actual PostgREST signature/audience verifier into the exact `p0-05-reviewed-rls.sql` policies. Owners A/B saw only their own records, including an owner-scoped public lead with NULL `user_id`.
4. Anonymous Data API requests and a forged JWT were rejected. A deliberately expired copy of an issued JWT payload, signed using the disposable fixture key, returned 401 from the real PostgREST verifier without an expiry wait.
5. The exact manifest-gated quarantine proposal preserved 39 unresolved synthetic records. All three API callers (anon/A/B) were denied access to the private schema. Fixture total here is 42: 3 provisionally owned rows + 39 quarantined rows; the separate PostgreSQL harness covers the 94-row workload and exact rollback.
6. Own lead insertion/status/follow-up/readback/clearing/deletion passed. Cross-owner insert was rejected, and cross-owner PATCH/DELETE returned zero rows.
7. Auth refresh and logout worked; the refresh token issued before logout could no longer refresh afterwards. Existing access JWTs have their separate expiry semantics; this does not claim logout instantly revokes every access JWT in PostgREST.
8. The final runner passed against a separate password-protected PostgreSQL cluster using SCRAM-SHA-256, including a generated authenticator role password and the provided local admin `PGPASSWORD`.

## How to run

Provide PostgreSQL 17 client/server tools and the pinned official Linux x86-64 binaries. Verify archive hashes before extraction, then pass absolute executable paths. Keep all database/services on loopback and use a **new** database whose name begins `leadflow_jwt_` and contains only lowercase letters, numbers and underscores.

Example once a disposable PostgreSQL instance is already running:

```bash
export PGHOST=127.0.0.1
export PGPORT=5432
export PGUSER=postgres
# PGPASSWORD, if required, comes only from the synthetic local/CI database.
export LEADFLOW_SYNTHETIC_ONLY=YES
createdb leadflow_jwt_rehearsal
PGDATABASE=leadflow_jwt_rehearsal \
LEADFLOW_AUTH_BIN=/absolute/path/to/auth \
LEADFLOW_POSTGREST_BIN=/absolute/path/to/postgrest \
node security/tests/local-auth-api.mjs
```

The runner refuses non-loopback DB hosts, existing public/Auth tables, unexpected executable hashes and privileged API roles. It binds Auth/PostgREST to `127.0.0.1` on ports 55440/55441 by default (optional `LEADFLOW_AUTH_PORT` / `LEADFLOW_REST_PORT`). It generates JWT/password material in memory, passes no real provider keys to child services and prints only named pass/fail checks. Child processes are terminated in `finally`; the caller must also stop its disposable PostgreSQL server. A CI PostgreSQL service can supply `PGHOST`, `PGPORT`, `PGUSER` and a fake CI-only `PGPASSWORD`.

Do not point this at a development database containing work you want to preserve. It creates synthetic Auth users, clients, leads, roles and restricted quarantine tables in the new test database. It does not delete/drop an existing project, infer any actual owner or modify production. A `postgres` NOLOGIN role is created only if the disposable cluster lacks that name because official Auth migrations reference it.

## Limits that remain

This closes the **local real signed-JWT/Data API authorization** gap. It does not verify the hosted Supabase project's JWT configuration, redirect allowlist, email confirmation delivery, actual session cookies in the deployed Next.js app, PKCE browser flow, public enquiry server action, Redis provider availability or end-to-end mobile journey. Hosted owner schema and 39 real unresolved records remain unchanged. Full production readiness still requires the private decisions, staging/app evidence and production approval described in `security-release-path.md`.


## Optional actual Next application boundary

Set `LEADFLOW_NEXT_FLOW=YES` to also build/start the checked-out Next.js app and test its real Proxy, SSR session cookies, owner scope, dashboard rendering and HTTP Server Actions against the same official Auth/PostgREST fixture. See `security-local-next-flow.md` for scope, prerequisites, observed checks and remaining browser/hosted/public-intake limitations. The default API-only runner remains available without compiling the app.
