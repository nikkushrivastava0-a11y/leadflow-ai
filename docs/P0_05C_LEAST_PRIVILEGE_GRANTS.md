# P0-05c — Remove non-row-scoped API-role table privileges

**Current state:** Draft SQL and isolated CI test only. **Not applied to Supabase.** Existing RLS is ON, but the legacy table grants still include TRUNCATE, TRIGGER and REFERENCES for both `anon` and `authenticated`.

## What the live read-only audit found

As of 2026-11-09, both `public.clients` and `public.leads` have RLS enabled. Their ACLs explicitly grant **TRUNCATE, TRIGGER and REFERENCES** to `anon` and `authenticated`, alongside read/write DML grants. Neither table has those elevated grants assigned through `PUBLIC` in the observed ACL; `postgres` and `service_role` also have independent grants.

**TRUNCATE is not governed by row-level security**. The default Supabase PostgREST row APIs do not directly expose a TRUNCATE endpoint, so these table grants alone do not prove that any unauthenticated HTTP request can truncate the database. Nonetheless, these unnecessary grants violate least privilege if API-role SQL access becomes available.

## This narrowly scoped SQL

File: `security/proposals/p0-05c-revoke-excess-grants.sql`

- Starts a transaction, checks an explicit staging-review session sentinel.
- Verifies `clients` and `leads` are present and still have RLS enabled.
- Revokes only `TRUNCATE, TRIGGER, REFERENCES` from `anon` and `authenticated`.
- Verifies the effective privileges have disappeared (including inherited grants). If any check fails, the entire transaction rolls back.
- **Preserves SELECT, INSERT, UPDATE and DELETE grants and all existing RLS policies.**
- Performs no customer-record queries, updates, deletes or table truncation.
- Leaves privileged `postgres` and `service_role` grants unchanged.
- Lives under `security/proposals/`, not auto-applied migrations.

This change **does not fix the owner dashboard or public form**. `clients` still lacks a SELECT policy, and `leads` has only `auth.uid()=user_id` SELECT/INSERT policies. Fixing that requires an independently reviewed ownership model and secure submission path (see draft PRs #40 and #41).

## Safe test evidence

A disposable PostgreSQL 17 container in GitHub Actions creates synthetic `anon`/`authenticated` roles and empty `clients`/`leads` test tables. It exercises the SQL both without approval (must fail without changing grants) and with a synthetic staging sentinel (must remove exactly the three privileges). It asserts that RLS stays enabled and that existing DML grants remain.

No production Supabase credentials or real leads are used in CI.

## Before any real change

1. Founder approves a maintenance operation on the actual project, after verifying the current ACL/RLS state, backups and connection path.
2. Independently review `security/proposals/p0-05c-readonly-grant-audit.sql` (read-only, no personal records) and capture its baseline in a private operations log.
3. Apply **only on an approved disposable staging clone first**, with a single session explicitly setting the sentinel before running the script. The sentinel is an accidental-execution guard, not an authorization system.
4. Test owner dashboard and public forms using fake data, then check the same ACL flags after the test.
5. Do not deploy this PR by merging its SQL automatically; the draft PR has **no production effect**.
6. Only after approval and staging evidence, apply a carefully coordinated production change, re-run the privilege query and Supabase Security Advisor.

**Rollback (emergency, explicit approval only):** restore the original grants with `GRANT TRUNCATE, TRIGGER, REFERENCES ON TABLE public.clients,public.leads TO anon,authenticated;`. This reintroduces non-row-scoped privileges and should not be the normal state.

## Independent verification queries

```sql
SELECT c.relname, r.rolname,
  has_table_privilege(r.rolname,c.oid,'TRUNCATE') AS truncate_granted,
  has_table_privilege(r.rolname,c.oid,'TRIGGER') AS trigger_granted,
  has_table_privilege(r.rolname,c.oid,'REFERENCES') AS references_granted,
  c.relrowsecurity AS rls_enabled
FROM pg_class c CROSS JOIN pg_roles r
WHERE c.relnamespace='public'::regnamespace
  AND c.relname IN ('clients','leads')
  AND r.rolname IN ('anon','authenticated')
ORDER BY 1,2;
```

References: [Supabase Securing your API](https://supabase.com/docs/guides/api/securing-your-api) and [PostgreSQL Row Security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html).
