-- REVIEW PROPOSAL ONLY. No automatic or production execution.
-- Uses the existing database; creates no external/paid service.
BEGIN;
DO $$BEGIN
 IF current_setting('leadflow.reviewed_postgres_guard',true) IS DISTINCT FROM 'APPROVED_SYNTHETIC_REHEARSAL' THEN
  RAISE EXCEPTION 'Reviewed PostgreSQL enquiry guard approval required';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='clients' AND column_name='owner_user_id') THEN
  RAISE EXCEPTION 'Reviewed owner-linked clients schema required';
 END IF;
 IF EXISTS(SELECT 1 FROM pg_namespace WHERE nspname='leadflow_guard') THEN
  RAISE EXCEPTION 'Existing guard schema requires separate reviewed upgrade';
 END IF;
END$$;
GRANT SELECT(slug,owner_user_id) ON public.clients TO service_role;
CREATE SCHEMA leadflow_guard;
REVOKE ALL ON SCHEMA leadflow_guard FROM PUBLIC,anon,authenticated;
GRANT USAGE ON SCHEMA leadflow_guard TO service_role;
CREATE TABLE leadflow_guard.buckets(
 key text PRIMARY KEY, tenant_key text NOT NULL, attempts integer NOT NULL CHECK(attempts>0), expires_at timestamptz NOT NULL
);
CREATE INDEX buckets_tenant_expiry ON leadflow_guard.buckets(tenant_key,expires_at);
CREATE TABLE leadflow_guard.reservations(
 key text PRIMARY KEY, tenant_key text NOT NULL, token uuid NOT NULL, committed boolean NOT NULL DEFAULT false, expires_at timestamptz NOT NULL
);
CREATE INDEX reservations_tenant_expiry ON leadflow_guard.reservations(tenant_key,expires_at);
ALTER TABLE leadflow_guard.buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE leadflow_guard.reservations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON leadflow_guard.buckets,leadflow_guard.reservations FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON leadflow_guard.buckets,leadflow_guard.reservations TO service_role;
CREATE POLICY guard_service_all ON leadflow_guard.buckets FOR ALL TO service_role USING(true) WITH CHECK(true);
CREATE POLICY guard_service_all ON leadflow_guard.reservations FOR ALL TO service_role USING(true) WITH CHECK(true);

-- INVOKER: only the server's service role can call/read/write. No public
-- SECURITY DEFINER bypass and no contact information is accepted or stored.
CREATE FUNCTION public.leadflow_enquiry_guard(
 p_operation text,p_slug text,p_tenant_key text,p_contact_key text,p_duplicate_key text,p_token uuid
) RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE
 t timestamptz := clock_timestamp(); tenant_attempts integer; contact_attempts integer; changed integer;
BEGIN
 IF p_operation IS NULL OR p_operation NOT IN ('reserve','complete','release')
 OR p_slug IS NULL OR p_slug !~ '^[a-z0-9][a-z0-9-]{0,63}$'
 OR p_tenant_key IS NULL OR p_tenant_key !~ '^lf:leads:tenant:[a-f0-9]{40}$'
 OR p_contact_key IS NULL OR p_contact_key !~ '^lf:leads:contact:[a-f0-9]{40}$'
 OR p_duplicate_key IS NULL OR p_duplicate_key !~ '^lf:leads:duplicate:[a-f0-9]{40}$'
 OR p_token IS NULL THEN RAISE EXCEPTION 'Invalid guard request'; END IF;
 -- Unknown/unprovisioned slugs never allocate counters or reservations.
 IF NOT EXISTS(SELECT 1 FROM public.clients WHERE slug=p_slug AND owner_user_id IS NOT NULL) THEN RETURN 0; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_tenant_key,0));
 t := clock_timestamp();
 IF p_operation='reserve' THEN
  DELETE FROM leadflow_guard.buckets WHERE tenant_key=p_tenant_key AND expires_at<=t;
  DELETE FROM leadflow_guard.reservations WHERE tenant_key=p_tenant_key AND expires_at<=t;
  INSERT INTO leadflow_guard.buckets(key,tenant_key,attempts,expires_at)
   VALUES(p_tenant_key,p_tenant_key,1,t+interval '1 hour')
   ON CONFLICT(key) DO UPDATE SET attempts=LEAST(leadflow_guard.buckets.attempts,60)+1
   RETURNING attempts INTO tenant_attempts;
  -- A tenant cap also bounds storage when an attacker varies contact details.
  IF tenant_attempts>60 THEN RETURN 2; END IF;
  INSERT INTO leadflow_guard.buckets(key,tenant_key,attempts,expires_at)
   VALUES(p_contact_key,p_tenant_key,1,t+interval '1 hour')
   ON CONFLICT(key) DO UPDATE SET attempts=LEAST(leadflow_guard.buckets.attempts,60)+1
   RETURNING attempts INTO contact_attempts;
  IF contact_attempts>4 THEN RETURN 2; END IF;
  INSERT INTO leadflow_guard.reservations(key,tenant_key,token,expires_at)
   VALUES(p_duplicate_key,p_tenant_key,p_token,t+interval '90 seconds') ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS changed=ROW_COUNT;
  RETURN CASE WHEN changed=1 THEN 1 ELSE 3 END;
 ELSIF p_operation='complete' THEN
  UPDATE leadflow_guard.reservations SET committed=true,expires_at=t+interval '10 minutes'
   WHERE key=p_duplicate_key AND tenant_key=p_tenant_key AND token=p_token AND committed=false AND expires_at>t;
  GET DIAGNOSTICS changed=ROW_COUNT; RETURN changed;
 ELSE
  DELETE FROM leadflow_guard.reservations
   WHERE key=p_duplicate_key AND tenant_key=p_tenant_key AND token=p_token AND committed=false;
  GET DIAGNOSTICS changed=ROW_COUNT; RETURN changed;
 END IF;
END$$;
REVOKE ALL ON FUNCTION public.leadflow_enquiry_guard(text,text,text,text,text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.leadflow_enquiry_guard(text,text,text,text,text,uuid) TO service_role;
COMMIT;
-- Rollback: first close PUBLIC_ENQUIRIES_ENABLED and remove the provider
-- configuration. Retain private state for review; do not reopen anon writes.
