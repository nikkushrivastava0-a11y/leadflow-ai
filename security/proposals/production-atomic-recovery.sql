-- PRODUCTION RECOVERY PROPOSAL ONLY. Requires separate explicit approval.
-- This restores unchanged quarantined rows under a restrictive API hold.
-- It never reopens old anonymous grants or overwrites newer records.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
LOCK TABLE public.clients,public.leads,leadflow_release_backup.leads_quarantine IN ACCESS EXCLUSIVE MODE;
DO $approval$
BEGIN
 IF current_setting('leadflow.atomic_recovery_approval',true) IS DISTINCT FROM 'APPROVED_FOR_THIS_EXACT_RECOVERY'
    OR current_setting('leadflow.maintenance_verified',true) IS DISTINCT FROM 'YES' THEN
   RAISE EXCEPTION 'Exact recovery approval and maintenance required';
 END IF;
 IF (SELECT count(*) FROM leadflow_release_backup.receipt)<>1
    OR (SELECT recovery_state FROM leadflow_release_backup.receipt) IS DISTINCT FROM 'CUTOVER' THEN
   RAISE EXCEPTION 'Missing or already-used cutover recovery receipt';
 END IF;
 IF EXISTS(SELECT 1 FROM public.leads l JOIN leadflow_release_backup.leads_quarantine q USING(id)) THEN
   RAISE EXCEPTION 'Recovery would collide with newer lead IDs';
 END IF;
END $approval$;
CREATE POLICY atomic_recovery_hold ON public.clients AS RESTRICTIVE FOR ALL TO PUBLIC USING(false) WITH CHECK(false);
CREATE POLICY atomic_recovery_hold ON public.leads AS RESTRICTIVE FOR ALL TO PUBLIC USING(false) WITH CHECK(false);
INSERT INTO public.leads SELECT * FROM leadflow_release_backup.leads_quarantine;
DO $restore$
DECLARE restored_leads_hash text; restored_clients_hash text;
BEGIN
 SELECT encode(sha256(convert_to(coalesce(string_agg(original_json::text,',' ORDER BY id),''),'UTF8')),'hex') INTO restored_leads_hash
 FROM(
  SELECT l.id,(SELECT jsonb_object_agg(e.key,e.value) FROM jsonb_each(to_jsonb(l)) e WHERE e.key=ANY(r.original_lead_columns)) original_json
  FROM public.leads l CROSS JOIN leadflow_release_backup.receipt r
 ) normalized;
 SELECT encode(sha256(convert_to(coalesce(string_agg(original_json::text,',' ORDER BY id),''),'UTF8')),'hex') INTO restored_clients_hash
 FROM(
  SELECT c.id,(SELECT jsonb_object_agg(e.key,e.value) FROM jsonb_each(to_jsonb(c)) e WHERE e.key=ANY(r.original_client_columns)) original_json
  FROM public.clients c CROSS JOIN leadflow_release_backup.receipt r
 ) normalized;
 IF (SELECT count(*) FROM public.leads)<>(SELECT leads_count FROM leadflow_release_backup.receipt)
    OR (SELECT count(*) FROM public.clients)<>(SELECT clients_count FROM leadflow_release_backup.receipt)
    OR restored_leads_hash IS DISTINCT FROM (SELECT leads_sha256 FROM leadflow_release_backup.receipt)
    OR restored_clients_hash IS DISTINCT FROM (SELECT clients_sha256 FROM leadflow_release_backup.receipt) THEN
   RAISE EXCEPTION 'Newer edits or missing rows: recovery aborted instead of overwriting';
 END IF;
END $restore$;
UPDATE leadflow_release_backup.receipt SET recovery_state='RESTORED_UNDER_HOLD';
-- Keep the restricted recovery copy, added columns and deny policies intact.
-- Releasing this hold needs a separately reviewed cutover; no broad GRANTs.
COMMIT;
