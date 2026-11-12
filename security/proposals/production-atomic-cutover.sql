-- PRODUCTION CUTOVER PROPOSAL ONLY — DO NOT EXECUTE WITHOUT SEPARATE APPROVAL.
-- No application/CI auto-run hook. Requires private owner/quarantine manifests,
-- an independently verified backup+restore receipt and frozen source snapshot.
-- See docs/security-atomic-cutover.md. Tests use synthetic data only.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
LOCK TABLE public.clients,public.leads IN ACCESS EXCLUSIVE MODE;
DO $approval$
BEGIN
 IF current_setting('leadflow.atomic_cutover_approval',true) IS DISTINCT FROM 'APPROVED_FOR_THIS_EXACT_PRODUCTION_COMMIT'
    OR current_setting('leadflow.maintenance_verified',true) IS DISTINCT FROM 'YES' THEN
   RAISE EXCEPTION 'Exact production approval and maintenance gates required';
 END IF;
 IF to_regclass('pg_temp.leadflow_owner_manifest') IS NULL
    OR to_regclass('pg_temp.leadflow_quarantine_manifest') IS NULL
    OR to_regclass('pg_temp.leadflow_release_receipt') IS NULL THEN
   RAISE EXCEPTION 'Private owner/quarantine manifests and backup restore receipt required';
 END IF;
 IF to_regnamespace('leadflow_release_backup') IS NOT NULL THEN
   RAISE EXCEPTION 'Existing release backup namespace requires review; never overwrite';
 END IF;
 IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='clients' AND column_name='owner_user_id') THEN
   RAISE EXCEPTION 'Owner schema already present; inspect release drift';
 END IF;
 IF EXISTS(SELECT 1 FROM pg_constraint WHERE contype='f' AND confrelid='public.leads'::regclass)
    OR EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid IN ('public.clients'::regclass,'public.leads'::regclass) AND NOT tgisinternal) THEN
   RAISE EXCEPTION 'Custom dependencies/triggers require a separate reviewed transfer';
 END IF;
 IF EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename IN ('clients','leads') AND NOT
   (tablename='leads' AND policyname IN ('Users can insert their own leads','Users can view their own leads'))) THEN
   RAISE EXCEPTION 'Unexpected pre-existing policies require review';
 END IF;
 IF (SELECT count(*) FROM pg_temp.leadflow_release_receipt)<>1 THEN
   RAISE EXCEPTION 'One backup restore receipt required';
 END IF;
 IF EXISTS(SELECT 1 FROM pg_temp.leadflow_release_receipt WHERE
   clients_count IS NULL OR clients_count<1 OR leads_count IS NULL OR leads_count<1
   OR quarantine_count IS NULL OR quarantine_count<1 OR quarantine_count>leads_count
   OR clients_sha256 IS NULL OR clients_sha256 !~ '^[0-9a-f]{64}$'
   OR leads_sha256 IS NULL OR leads_sha256 !~ '^[0-9a-f]{64}$'
   OR schema_sha256 IS NULL OR schema_sha256 !~ '^[0-9a-f]{64}$'
   OR backup_sha256 IS NULL OR backup_sha256 !~ '^[0-9a-f]{64}$'
   OR owner_manifest_sha256 IS NULL OR owner_manifest_sha256 !~ '^[0-9a-f]{64}$'
   OR quarantine_manifest_sha256 IS NULL OR quarantine_manifest_sha256 !~ '^[0-9a-f]{64}$'
   OR backup_reference IS NULL OR length(trim(backup_reference))<8
   OR restore_receipt IS NULL OR length(trim(restore_receipt))<10
   OR approved_commit IS NULL OR approved_commit !~ '^[0-9a-f]{40}$') THEN
   RAISE EXCEPTION 'Backup digest, verified restore evidence, commit and source snapshot required';
 END IF;
 IF (SELECT approved_commit FROM pg_temp.leadflow_release_receipt)
      IS DISTINCT FROM current_setting('leadflow.approved_commit',true) THEN
   RAISE EXCEPTION 'Receipt commit differs from explicitly approved source commit';
 END IF;
 IF (SELECT encode(sha256(convert_to(coalesce(string_agg(to_jsonb(m)::text,',' ORDER BY client_id),''),'UTF8')),'hex') FROM pg_temp.leadflow_owner_manifest m)
      IS DISTINCT FROM (SELECT owner_manifest_sha256 FROM pg_temp.leadflow_release_receipt)
    OR (SELECT encode(sha256(convert_to(coalesce(string_agg(to_jsonb(q)::text,',' ORDER BY id),''),'UTF8')),'hex') FROM pg_temp.leadflow_quarantine_manifest q)
      IS DISTINCT FROM (SELECT quarantine_manifest_sha256 FROM pg_temp.leadflow_release_receipt) THEN
   RAISE EXCEPTION 'Private manifests changed since approval receipt';
 END IF;
 IF (SELECT count(*) FROM pg_temp.leadflow_owner_manifest)<>(SELECT count(*) FROM public.clients)
    OR (SELECT count(DISTINCT client_id) FROM pg_temp.leadflow_owner_manifest)<>(SELECT count(*) FROM public.clients)
    OR (SELECT count(DISTINCT owner_user_id) FROM pg_temp.leadflow_owner_manifest)<>(SELECT count(*) FROM public.clients)
    OR EXISTS(SELECT 1 FROM pg_temp.leadflow_owner_manifest m LEFT JOIN public.clients c ON c.id=m.client_id LEFT JOIN auth.users u ON u.id=m.owner_user_id
      WHERE c.id IS NULL OR u.id IS NULL OR u.email_confirmed_at IS NULL OR m.evidence_ref IS NULL OR length(trim(m.evidence_ref))<6) THEN
   RAISE EXCEPTION 'Explicit unique confirmed Auth owner mapping and private provenance required for every business';
 END IF;
END $approval$;

CREATE TEMP TABLE leadflow_locked_snapshot ON COMMIT DROP AS
SELECT
 (SELECT count(*) FROM public.clients)::bigint AS clients_count,
 (SELECT count(*) FROM public.leads)::bigint AS leads_count,
 (SELECT encode(sha256(convert_to(coalesce(string_agg(to_jsonb(c)::text,',' ORDER BY id),''),'UTF8')),'hex') FROM public.clients c) AS clients_sha256,
 (SELECT encode(sha256(convert_to(coalesce(string_agg(to_jsonb(l)::text,',' ORDER BY id),''),'UTF8')),'hex') FROM public.leads l) AS leads_sha256,
 encode(sha256(convert_to((
   SELECT jsonb_build_object(
     'columns',(SELECT jsonb_agg(jsonb_build_object('table',table_name,'column',column_name,'position',ordinal_position,'type',data_type,'nullable',is_nullable,'default',column_default) ORDER BY table_name,ordinal_position)
                FROM information_schema.columns WHERE table_schema='public' AND table_name IN ('clients','leads')),
     'policies',(SELECT coalesce(jsonb_agg(jsonb_build_object('table',tablename,'name',policyname,'command',cmd,'roles',roles,'using',qual,'check',with_check,'permissive',permissive) ORDER BY tablename,policyname),'[]'::jsonb)
                 FROM pg_policies WHERE schemaname='public' AND tablename IN ('clients','leads')),
     'relations',(SELECT jsonb_agg(jsonb_build_object('name',c.relname,'rls',c.relrowsecurity,'force_rls',c.relforcerowsecurity,'acl',c.relacl) ORDER BY c.relname)
                  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname IN ('clients','leads')),
     'constraints',(SELECT coalesce(jsonb_agg(jsonb_build_object('table',c.conrelid::regclass::text,'name',c.conname,'definition',pg_get_constraintdef(c.oid)) ORDER BY c.conrelid::regclass::text,c.conname),'[]'::jsonb)
                    FROM pg_constraint c WHERE c.conrelid IN ('public.clients'::regclass,'public.leads'::regclass)),
     'column_acl',(SELECT jsonb_agg(jsonb_build_object('table',c.relname,'column',a.attname,'acl',a.attacl) ORDER BY c.relname,a.attnum)
                   FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace
                   WHERE n.nspname='public' AND c.relname IN ('clients','leads') AND a.attnum>0 AND NOT a.attisdropped)
   )
 )::text,'UTF8')),'hex') AS schema_sha256;
DO $snapshot$
BEGIN
 IF EXISTS(SELECT 1 FROM leadflow_locked_snapshot s CROSS JOIN pg_temp.leadflow_release_receipt r
   WHERE s.clients_count<>r.clients_count OR s.leads_count<>r.leads_count OR s.clients_sha256<>r.clients_sha256 OR s.leads_sha256<>r.leads_sha256 OR s.schema_sha256<>r.schema_sha256) THEN
   RAISE EXCEPTION 'Source changed since backed-up/restored snapshot; cutover aborted';
 END IF;
END $snapshot$;
CREATE TEMP TABLE leadflow_unresolved_now ON COMMIT DROP AS
SELECT l.id FROM public.leads l LEFT JOIN public.clients c ON c.slug=l.client_slug
LEFT JOIN pg_temp.leadflow_owner_manifest m ON m.client_id=c.id
WHERE (l.client_slug IS NOT NULL AND c.id IS NULL)
   OR (l.client_slug IS NULL AND NOT EXISTS(SELECT 1 FROM pg_temp.leadflow_owner_manifest own WHERE own.owner_user_id=l.user_id))
   OR (l.client_slug IS NOT NULL AND c.id IS NOT NULL AND l.user_id IS NOT NULL AND l.user_id IS DISTINCT FROM m.owner_user_id);
DO $quarantine$
BEGIN
 IF (SELECT count(*) FROM pg_temp.leadflow_quarantine_manifest)<>(SELECT quarantine_count FROM pg_temp.leadflow_release_receipt)
    OR (SELECT count(DISTINCT id) FROM pg_temp.leadflow_quarantine_manifest)<>(SELECT count(*) FROM pg_temp.leadflow_quarantine_manifest)
    OR EXISTS(SELECT id FROM leadflow_unresolved_now EXCEPT SELECT id FROM pg_temp.leadflow_quarantine_manifest)
    OR EXISTS(SELECT id FROM pg_temp.leadflow_quarantine_manifest EXCEPT SELECT id FROM leadflow_unresolved_now)
    OR EXISTS(SELECT 1 FROM pg_temp.leadflow_quarantine_manifest WHERE evidence_ref IS NULL OR length(trim(evidence_ref))<6) THEN
   RAISE EXCEPTION 'Exact private reviewed quarantine manifest/provenance differs from current unresolved cohort';
 END IF;
END $quarantine$;

CREATE SCHEMA leadflow_release_backup;
REVOKE ALL ON SCHEMA leadflow_release_backup FROM PUBLIC,anon,authenticated;
CREATE TABLE leadflow_release_backup.receipt AS
SELECT r.*,
 (SELECT array_agg(column_name::text ORDER BY ordinal_position) FROM information_schema.columns WHERE table_schema='public' AND table_name='leads') AS original_lead_columns,
 (SELECT array_agg(column_name::text ORDER BY ordinal_position) FROM information_schema.columns WHERE table_schema='public' AND table_name='clients') AS original_client_columns,
 'CUTOVER'::text AS recovery_state
FROM pg_temp.leadflow_release_receipt r;
ALTER TABLE leadflow_release_backup.receipt ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON leadflow_release_backup.receipt FROM PUBLIC,anon,authenticated;
-- Align the new nullable field before LIKE so rollback preserves table shape.
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS next_follow_up_at timestamptz;
CREATE TABLE leadflow_release_backup.leads_quarantine(LIKE public.leads INCLUDING ALL);
ALTER TABLE leadflow_release_backup.leads_quarantine ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON leadflow_release_backup.leads_quarantine FROM PUBLIC,anon,authenticated;
DO $service$
BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN
   REVOKE ALL ON SCHEMA leadflow_release_backup FROM service_role;
   REVOKE ALL ON leadflow_release_backup.receipt,leadflow_release_backup.leads_quarantine FROM service_role;
 END IF;
END $service$;
WITH moved AS(
 DELETE FROM public.leads l USING pg_temp.leadflow_quarantine_manifest q WHERE l.id=q.id RETURNING l.*
) INSERT INTO leadflow_release_backup.leads_quarantine SELECT * FROM moved;

-- Assign ONLY approved immutable IDs from the private owner manifest.
-- No email matching, contact similarity or user metadata can choose an owner.
ALTER TABLE public.clients ADD COLUMN owner_user_id uuid REFERENCES auth.users(id) ON DELETE RESTRICT;
UPDATE public.clients c SET owner_user_id=m.owner_user_id FROM pg_temp.leadflow_owner_manifest m WHERE m.client_id=c.id;
ALTER TABLE public.clients ALTER COLUMN owner_user_id SET NOT NULL;
CREATE UNIQUE INDEX clients_owner_user_id_uniq ON public.clients(owner_user_id);
CREATE INDEX leads_client_slug_idx ON public.leads(client_slug);
CREATE INDEX leads_user_id_idx ON public.leads(user_id);

-- Drop old column grants too: table-level REVOKE alone leaves column ACLs.
DO $column_acl$
DECLARE target text; columns text;
BEGIN
 FOREACH target IN ARRAY ARRAY['clients','leads'] LOOP
   SELECT string_agg(quote_ident(column_name),',') INTO columns FROM information_schema.columns WHERE table_schema='public' AND table_name=target;
   EXECUTE format('REVOKE SELECT (%s), INSERT (%s), UPDATE (%s), REFERENCES (%s) ON TABLE public.%I FROM anon,authenticated,PUBLIC',columns,columns,columns,columns,target);
 END LOOP;
END $column_acl$;

-- Exact owner policies / least-privilege grants from the reviewed candidate.
-- Existing policies are replaced, never combined with reviewed owner policies.
-- Replace rather than combine permissive rules during activation.
DROP POLICY IF EXISTS "Users can insert their own leads" ON public.leads;
DROP POLICY IF EXISTS "Users can view their own leads" ON public.leads;

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Revoke old database-wide grants. RLS alone is NOT enough if API roles
-- keep TRUNCATE, TRIGGER or REFERENCES privileges.
REVOKE ALL PRIVILEGES ON TABLE public.clients FROM anon, authenticated, PUBLIC;
REVOKE ALL PRIVILEGES ON TABLE public.leads FROM anon, authenticated, PUBLIC;

-- Clients are private. No anon SELECT on clients because owner_email and
-- other profile data must not become enumerable via Data API.
-- Owner dashboard's client lookup will continue to select its own slug.
GRANT SELECT ON TABLE public.clients TO authenticated;
CREATE POLICY clients_owner_select
  ON public.clients FOR SELECT TO authenticated
  USING (owner_user_id = (SELECT auth.uid()));

-- No direct clients INSERT/UPDATE/DELETE to authenticated or anon.
-- New-client provisioning must be a separate verified, authenticated,
-- narrowly scoped server operation.

-- Nullable follow-up field required by the release-candidate owner workflow.
-- Additive; existing rows keep NULL and no owner mapping changes here.
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS next_follow_up_at timestamptz;

-- CRM: authenticated owners only, with column-level mutating grants.
GRANT SELECT ON TABLE public.leads TO authenticated;
GRANT INSERT (
  user_id, client_slug, name, email, phone, source, notes,
  status, score, score_reason
) ON TABLE public.leads TO authenticated;
GRANT UPDATE (status, updated_at, next_follow_up_at) ON TABLE public.leads TO authenticated;
GRANT DELETE ON TABLE public.leads TO authenticated;

-- Authorize by verified business slug when present.
-- Legacy user_id fallback is allowed ONLY when client_slug is NULL.
-- Do not use NOT EXISTS on clients for a non-null orphan slug here:
-- clients RLS filters other businesses from view, so NOT EXISTS could be
-- TRUE for a different tenant and leak their row to a conflicting user_id.
CREATE POLICY leads_owner_select
  ON public.leads FOR SELECT TO authenticated
  USING (
    (
      client_slug IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.clients c
        WHERE c.slug = leads.client_slug
          AND c.owner_user_id = (SELECT auth.uid())
      )
    )
    OR
    (
      user_id = (SELECT auth.uid())
      AND client_slug IS NULL
      AND EXISTS (
        SELECT 1 FROM public.clients c
        WHERE c.owner_user_id = (SELECT auth.uid())
      )
    )
  );

-- Manual inserts require BOTH the verified owner id and matching business.
-- Direct anon inserts are NOT permitted. Public forms need a protected
-- Next.js server submission with an approved server-only credential and
-- atomic anti-spam guard; a public anon insert grant would bypass it.
CREATE POLICY leads_owner_insert
  ON public.leads FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.slug = leads.client_slug
        AND c.owner_user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY leads_owner_update
  ON public.leads FOR UPDATE TO authenticated
  USING (
    client_slug IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.slug = leads.client_slug
        AND c.owner_user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    client_slug IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.slug = leads.client_slug
        AND c.owner_user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY leads_owner_delete
  ON public.leads FOR DELETE TO authenticated
  USING (
    client_slug IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.slug = leads.client_slug
        AND c.owner_user_id = (SELECT auth.uid())
    )
  );

-- Intentionally NO anon policies and NO anon grants.
-- Intentional side effect until secure public form adapter is rolled out:
-- anonymous enquiry insert and client slug lookup will FAIL.
-- We prefer a visible outage in staging over silently exposing customer PII.

DO $preservation$
DECLARE source_leads_hash text; source_clients_hash text;
BEGIN
 IF (SELECT count(*) FROM public.leads)+(SELECT count(*) FROM leadflow_release_backup.leads_quarantine)<>(SELECT leads_count FROM leadflow_release_backup.receipt)
    OR (SELECT count(*) FROM leadflow_release_backup.leads_quarantine)<>(SELECT quarantine_count FROM leadflow_release_backup.receipt) THEN
   RAISE EXCEPTION 'Atomic cutover row conservation failed';
 END IF;
 SELECT encode(sha256(convert_to(coalesce(string_agg(original_json::text,',' ORDER BY id),''),'UTF8')),'hex') INTO source_leads_hash
 FROM(
  SELECT all_rows.id,(SELECT jsonb_object_agg(e.key,e.value) FROM jsonb_each(to_jsonb(all_rows)) e WHERE e.key=ANY(r.original_lead_columns)) original_json
  FROM(SELECT * FROM public.leads UNION ALL SELECT * FROM leadflow_release_backup.leads_quarantine) all_rows CROSS JOIN leadflow_release_backup.receipt r
 ) normalized;
 SELECT encode(sha256(convert_to(coalesce(string_agg(original_json::text,',' ORDER BY id),''),'UTF8')),'hex') INTO source_clients_hash
 FROM(
  SELECT c.id,(SELECT jsonb_object_agg(e.key,e.value) FROM jsonb_each(to_jsonb(c)) e WHERE e.key=ANY(r.original_client_columns)) original_json
  FROM public.clients c CROSS JOIN leadflow_release_backup.receipt r
 ) normalized;
 IF source_leads_hash IS DISTINCT FROM (SELECT leads_sha256 FROM leadflow_release_backup.receipt)
    OR source_clients_hash IS DISTINCT FROM (SELECT clients_sha256 FROM leadflow_release_backup.receipt) THEN
   RAISE EXCEPTION 'Original lead/client full-row content changed unexpectedly';
 END IF;
 IF EXISTS(SELECT 1 FROM public.leads l LEFT JOIN public.clients c ON c.slug=l.client_slug
    WHERE (l.client_slug IS NOT NULL AND (c.id IS NULL OR (l.user_id IS NOT NULL AND l.user_id IS DISTINCT FROM c.owner_user_id)))
      OR (l.client_slug IS NULL AND NOT EXISTS(SELECT 1 FROM public.clients own WHERE own.owner_user_id=l.user_id))) THEN
   RAISE EXCEPTION 'Unresolved lead remains in customer exposure set';
 END IF;
END $preservation$;
COMMIT;
