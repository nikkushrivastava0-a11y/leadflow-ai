-- STAGING REHEARSAL ONLY. Requires writes paused and identical column shape.
-- Never weaken RLS/grants to restore old app behavior. The quarantined rows
-- must remain inaccessible to normal callers after any restoration.
-- SET leadflow.reviewed_quarantine_rollback='APPROVED_IN_STAGING';
BEGIN;
LOCK TABLE public.leads,leadflow_quarantine.leads IN ACCESS EXCLUSIVE MODE;
DO $review$
BEGIN
  IF current_setting('leadflow.reviewed_quarantine_rollback',true)
     IS DISTINCT FROM 'APPROVED_IN_STAGING' THEN
    RAISE EXCEPTION 'Quarantine rollback staging approval missing';
  END IF;
  IF (SELECT count(*) FROM leadflow_quarantine.batch_meta)<>1 THEN
    RAISE EXCEPTION 'Missing or ambiguous quarantine baseline';
  END IF;
  IF EXISTS(SELECT 1 FROM public.leads l JOIN leadflow_quarantine.leads q USING(id)) THEN
    RAISE EXCEPTION 'Lead ID collision; never overwrite a newer row';
  END IF;
END $review$;
-- Restoration is an admin recovery step, not permission to expose unresolved
-- rows. Restrictive hold combines with every permissive policy and denies all
-- normal API roles until a separate reviewed migration clears the release gate.
CREATE POLICY quarantine_rollback_hold ON public.leads AS RESTRICTIVE
  FOR ALL TO PUBLIC USING (false) WITH CHECK (false);
INSERT INTO public.leads SELECT * FROM leadflow_quarantine.leads;
DO $restore$
BEGIN
  IF (SELECT count(*) FROM public.leads)<>(SELECT original_count FROM leadflow_quarantine.batch_meta)
     OR (SELECT md5(string_agg(to_jsonb(l)::text,',' ORDER BY id)) FROM public.leads l)
        IS DISTINCT FROM (SELECT original_checksum FROM leadflow_quarantine.batch_meta) THEN
    RAISE EXCEPTION 'Exact original full-row state not restored; rollback transaction aborted';
  END IF;
END $restore$;
-- Private copy intentionally retained as a restricted recovery artifact.
-- No record deletion, privilege restoration or DROP SCHEMA in this rehearsal.
COMMIT;
