-- STAGING PROPOSAL ONLY. NOT approved for production; no auto-run hook.
-- Run only in an approved disposable clone with the same reviewed schema.
-- Requires a private admin session to create a TEMPORARY table named
-- leadflow_reviewed_quarantine_ids(id uuid PRIMARY KEY), populated from the
-- privately reviewed manifest. Never commit real IDs or print that manifest.
-- Require explicit settings in that same admin session:
-- SET leadflow.reviewed_quarantine_release='APPROVED_IN_STAGING';
-- SET leadflow.reviewed_quarantine_count='39'; -- reviewed current count, not assumption
-- Also verify leadflow_quarantine is NOT an exposed Data API schema.
BEGIN;
LOCK TABLE public.clients, public.leads IN ACCESS EXCLUSIVE MODE;
DO $review$
DECLARE
  expected integer;
BEGIN
  IF current_setting('leadflow.reviewed_quarantine_release',true)
     IS DISTINCT FROM 'APPROVED_IN_STAGING' THEN
    RAISE EXCEPTION 'Quarantine staging approval missing';
  END IF;
  expected := nullif(current_setting('leadflow.reviewed_quarantine_count',true),'')::integer;
  IF expected IS NULL OR expected < 1 THEN
    RAISE EXCEPTION 'Explicit reviewed quarantine count required';
  END IF;
  IF to_regclass('pg_temp.leadflow_reviewed_quarantine_ids') IS NULL THEN
    RAISE EXCEPTION 'Private reviewed temporary manifest required';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname='leadflow_quarantine') THEN
    RAISE EXCEPTION 'Quarantine namespace already exists; inspect rather than overwrite';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE contype='f' AND confrelid='public.leads'::regclass)
     OR EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='public.leads'::regclass AND NOT tgisinternal) THEN
    RAISE EXCEPTION 'Lead dependencies/triggers need a separately reviewed transfer plan';
  END IF;
  IF (SELECT count(*) FROM pg_temp.leadflow_reviewed_quarantine_ids) <> expected THEN
    RAISE EXCEPTION 'Reviewed manifest count differs from expected count';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_temp.leadflow_reviewed_quarantine_ids q
    LEFT JOIN public.leads l ON l.id=q.id WHERE l.id IS NULL
  ) THEN RAISE EXCEPTION 'Reviewed manifest contains missing lead IDs'; END IF;
END $review$;

-- Classification matches the aggregate assessment; no contact matching.
CREATE TEMP TABLE leadflow_current_unresolved ON COMMIT DROP AS
WITH verified_owner AS (
  SELECT c.id client_id,u.id auth_user_id FROM public.clients c JOIN auth.users u
    ON lower(trim(c.owner_email))=lower(trim(u.email)) AND u.email_confirmed_at IS NOT NULL
)
SELECT l.id FROM public.leads l LEFT JOIN public.clients c ON c.slug=l.client_slug
WHERE (l.client_slug IS NOT NULL AND c.id IS NULL)
   OR (l.client_slug IS NULL AND NOT EXISTS(SELECT 1 FROM verified_owner v WHERE v.auth_user_id=l.user_id))
   OR (l.client_slug IS NOT NULL AND c.id IS NOT NULL AND (
     NOT EXISTS(SELECT 1 FROM verified_owner v WHERE v.client_id=c.id)
     OR (l.user_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM verified_owner v WHERE v.client_id=c.id AND v.auth_user_id=l.user_id))
   ));
DO $manifest$
BEGIN
  IF EXISTS (SELECT id FROM leadflow_current_unresolved EXCEPT SELECT id FROM pg_temp.leadflow_reviewed_quarantine_ids)
     OR EXISTS (SELECT id FROM pg_temp.leadflow_reviewed_quarantine_ids EXCEPT SELECT id FROM leadflow_current_unresolved) THEN
    RAISE EXCEPTION 'Current unresolved cohort differs from privately reviewed manifest';
  END IF;
END $manifest$;

CREATE SCHEMA leadflow_quarantine;
REVOKE ALL ON SCHEMA leadflow_quarantine FROM PUBLIC,anon,authenticated;
CREATE TABLE leadflow_quarantine.leads (LIKE public.leads INCLUDING ALL);
ALTER TABLE leadflow_quarantine.leads ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON leadflow_quarantine.leads FROM PUBLIC,anon,authenticated;
-- Explicit service_role revocation where the synthetic or Supabase role exists.
DO $service$
BEGIN
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN
    REVOKE ALL ON SCHEMA leadflow_quarantine FROM service_role;
    REVOKE ALL ON leadflow_quarantine.leads FROM service_role;
  END IF;
END $service$;
CREATE TABLE leadflow_quarantine.batch_meta AS
SELECT count(*)::bigint original_count,
       md5(string_agg(to_jsonb(l)::text,',' ORDER BY id)) original_checksum
FROM public.leads l;
REVOKE ALL ON leadflow_quarantine.batch_meta FROM PUBLIC,anon,authenticated;
ALTER TABLE leadflow_quarantine.batch_meta ENABLE ROW LEVEL SECURITY;

WITH moved AS (
  DELETE FROM public.leads l USING pg_temp.leadflow_reviewed_quarantine_ids q
  WHERE l.id=q.id RETURNING l.*
) INSERT INTO leadflow_quarantine.leads SELECT * FROM moved;
DO $conservation$
BEGIN
  IF (SELECT count(*) FROM leadflow_quarantine.leads) <> current_setting('leadflow.reviewed_quarantine_count')::integer
     OR (SELECT count(*) FROM public.leads)+(SELECT count(*) FROM leadflow_quarantine.leads)
        <> (SELECT original_count FROM leadflow_quarantine.batch_meta) THEN
    RAISE EXCEPTION 'Quarantine row conservation failed';
  END IF;
  IF (SELECT md5(string_agg(to_jsonb(all_leads)::text,',' ORDER BY id))
      FROM (SELECT * FROM public.leads UNION ALL SELECT * FROM leadflow_quarantine.leads) all_leads)
     IS DISTINCT FROM (SELECT original_checksum FROM leadflow_quarantine.batch_meta) THEN
    RAISE EXCEPTION 'Quarantine full-row preservation failed';
  END IF;
END $conservation$;
COMMIT;
