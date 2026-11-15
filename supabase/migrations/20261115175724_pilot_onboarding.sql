BEGIN;
DO $$BEGIN IF current_setting('leadflow.feature_migrations',true) IS DISTINCT FROM 'REVIEWED' THEN RAISE EXCEPTION 'Reviewed migration required'; END IF; END$$;
ALTER TABLE public.clients ADD COLUMN trial_started_at timestamptz, ADD COLUMN trial_expires_at timestamptz;
GRANT USAGE ON SCHEMA auth TO service_role;
GRANT SELECT(id,email,email_confirmed_at) ON auth.users TO service_role;
GRANT SELECT,INSERT ON public.clients TO service_role;
DO $sequence_grant$ DECLARE sequence_name text=pg_get_serial_sequence('public.clients','id'); BEGIN
 IF sequence_name IS NOT NULL THEN EXECUTE format('GRANT USAGE,SELECT,UPDATE ON SEQUENCE %s TO service_role',sequence_name); END IF;
END $sequence_grant$;
CREATE FUNCTION public.pilot_provision_workspace(p_user uuid,p_slug text,p_name text) RETURNS text
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE existing text; address text; next_id bigint;sequence_name text=pg_get_serial_sequence('public.clients','id');
BEGIN
 IF p_user IS NULL OR p_slug IS NULL OR p_slug!~'^biz-[a-f0-9]{20}$' OR p_name IS NULL OR length(p_name) NOT BETWEEN 1 AND 80 THEN RAISE EXCEPTION 'Invalid provisioning request'; END IF;
 SELECT email INTO address FROM auth.users WHERE id=p_user AND email_confirmed_at IS NOT NULL;
 IF address IS NULL THEN RAISE EXCEPTION 'Confirmed Auth identity required'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('pilot-workspace-provisioning',0));
 SELECT slug INTO existing FROM public.clients WHERE owner_user_id=p_user;
 IF existing IS NOT NULL THEN RETURN existing; END IF;
 SELECT coalesce(max(id),0)+1 INTO next_id FROM public.clients;
 IF sequence_name IS NOT NULL THEN
  PERFORM setval(sequence_name::regclass,greatest(next_id,coalesce(pg_sequence_last_value(sequence_name::regclass),0)+1),false);
  INSERT INTO public.clients(slug,business_name,owner_email,owner_user_id,trial_started_at,trial_expires_at) VALUES(p_slug,p_name,address,p_user,now(),now()+interval '14 days');
 ELSE
  INSERT INTO public.clients(id,slug,business_name,owner_email,owner_user_id,trial_started_at,trial_expires_at) VALUES(next_id,p_slug,p_name,address,p_user,now(),now()+interval '14 days');
 END IF;
 RETURN p_slug;
END $$;
REVOKE ALL ON FUNCTION public.pilot_provision_workspace(uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.pilot_provision_workspace(uuid,text,text) TO service_role;
COMMIT;
