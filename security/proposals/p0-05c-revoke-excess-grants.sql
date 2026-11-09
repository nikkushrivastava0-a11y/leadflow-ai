-- P0-05c / SECURITY REVIEW ONLY
-- This file is NOT in supabase/migrations and MUST NOT be automatically run.
-- It ONLY removes non-row-scoped privileges from anon/authenticated on
-- public.clients and public.leads; it does not touch rows or change RLS policies.
--
-- Before a carefully reviewed STAGING execution in one psql connection:
--   SET leadflow.approved_nonrow_grant_change = 'reviewed-staging';
--   \i security/proposals/p0-05c-revoke-excess-grants.sql
--
-- DO NOT EXECUTE ON LIVE PRODUCTION WITHOUT EXPLICIT FOUNDER APPROVAL,
-- BACKUP/ROLLBACK CHECK AND TESTING. A developer can set this session
-- sentinel; it is an accident-prevention guard, NOT an authorization control.

BEGIN;

DO $preflight$
DECLARE
  table_count integer;
  rls_count integer;
BEGIN
  IF current_setting('leadflow.approved_nonrow_grant_change', true)
    IS DISTINCT FROM 'reviewed-staging' THEN
    RAISE EXCEPTION 'P0-05c denied: explicit staging review sentinel absent';
  END IF;

  SELECT count(*), count(*) FILTER (WHERE c.relrowsecurity)
  INTO table_count, rls_count
  FROM pg_class c
  WHERE c.relnamespace = 'public'::regnamespace
    AND c.relkind IN ('r','p')
    AND c.relname IN ('clients','leads');

  IF table_count <> 2 OR rls_count <> 2 THEN
    RAISE EXCEPTION 'P0-05c denied: clients/leads missing or RLS disabled';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon')
     OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
    RAISE EXCEPTION 'P0-05c denied: Supabase API roles unavailable';
  END IF;
END
$preflight$;

-- Privileges below are TABLE-WIDE and are not controlled by RLS.
-- DML permissions are intentionally preserved: this is NOT the larger
-- data-owner / RLS policy migration proposed separately in PR #40.
REVOKE TRUNCATE, TRIGGER, REFERENCES
  ON TABLE public.clients, public.leads
  FROM anon, authenticated;

-- Verify the effective privilege is gone, including any inherited grants.
-- On failure the entire transaction is rolled back.
DO $postflight$
DECLARE
  v record;
BEGIN
  FOR v IN
    SELECT c.oid AS table_oid, c.relname AS table_name,
           r.rolname AS role_name
    FROM pg_class c CROSS JOIN pg_roles r
    WHERE c.relnamespace = 'public'::regnamespace
      AND c.relname IN ('clients','leads')
      AND r.rolname IN ('anon','authenticated')
  LOOP
    IF has_table_privilege(v.role_name, v.table_oid, 'TRUNCATE')
       OR has_table_privilege(v.role_name, v.table_oid, 'TRIGGER')
       OR has_table_privilege(v.role_name, v.table_oid, 'REFERENCES') THEN
      RAISE EXCEPTION
        'P0-05c grant still effective: role %, table %',
        v.role_name, v.table_name;
    END IF;
  END LOOP;
END
$postflight$;

COMMIT;
