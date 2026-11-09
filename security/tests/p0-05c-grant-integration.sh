#!/usr/bin/env bash
set -euo pipefail

echo "Setting up a disposable PostgreSQL test schema (no Supabase connection)"
psql -v ON_ERROR_STOP=1 <<'SQL'
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE TABLE public.clients (id bigint PRIMARY KEY, slug text NOT NULL);
CREATE TABLE public.leads (id bigint PRIMARY KEY, client_slug text);
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
GRANT ALL PRIVILEGES ON public.clients,public.leads TO anon,authenticated;
SQL

echo "Check that migration is blocked without a review sentinel"
if psql -v ON_ERROR_STOP=1 -f security/proposals/p0-05c-revoke-excess-grants.sql >/dev/null 2>&1; then
  echo "ERROR: SQL applied without review sentinel" >&2
  exit 1
fi

echo "Check that fail-closed preflight did not change privileges"
psql -v ON_ERROR_STOP=1 <<'SQL'
DO $$
BEGIN
  IF NOT has_table_privilege('anon','public.clients','TRUNCATE') THEN
    RAISE EXCEPTION 'Unapproved SQL changed privileges';
  END IF;
END
$$;
SQL

echo "Run explicitly reviewed proposal in synthetic staging only"
psql -v ON_ERROR_STOP=1 \
  -c "SET leadflow.approved_nonrow_grant_change = 'reviewed-staging';" \
  -f security/proposals/p0-05c-revoke-excess-grants.sql

echo "Verify all four role-table combinations, basic DML grants and RLS"
psql -v ON_ERROR_STOP=1 <<'SQL'
DO $$
DECLARE row record;
BEGIN
  FOR row IN SELECT c.oid AS relid,c.relrowsecurity,r.rolname
             FROM pg_class c CROSS JOIN pg_roles r
             WHERE c.relnamespace='public'::regnamespace
               AND c.relname IN ('clients','leads')
               AND r.rolname IN ('anon','authenticated')
  LOOP
    IF NOT row.relrowsecurity
       OR has_table_privilege(row.rolname,row.relid,'TRUNCATE')
       OR has_table_privilege(row.rolname,row.relid,'TRIGGER')
       OR has_table_privilege(row.rolname,row.relid,'REFERENCES') THEN
      RAISE EXCEPTION 'Non-row privilege or RLS regression for %',row.rolname;
    END IF;

    IF NOT has_table_privilege(row.rolname,row.relid,'SELECT')
       OR NOT has_table_privilege(row.rolname,row.relid,'INSERT')
       OR NOT has_table_privilege(row.rolname,row.relid,'UPDATE')
       OR NOT has_table_privilege(row.rolname,row.relid,'DELETE') THEN
      RAISE EXCEPTION 'Essential DML grant lost for %',row.rolname;
    END IF;
  END LOOP;

  IF NOT has_table_privilege('postgres','public.leads','TRUNCATE') THEN
    RAISE EXCEPTION 'Unexpected privilege change to DBA';
  END IF;
END
$$;
SQL

echo "PASS: reviewed grants only; RLS and DML grants preserved"
