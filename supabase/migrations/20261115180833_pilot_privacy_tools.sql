BEGIN;
DO $$BEGIN IF current_setting('leadflow.feature_migrations',true) IS DISTINCT FROM 'REVIEWED' THEN RAISE EXCEPTION 'Reviewed migration required'; END IF; END$$;
ALTER TABLE public.leads ADD COLUMN consented_at timestamptz,ADD COLUMN notice_version text,ADD COLUMN anonymized_at timestamptz;
GRANT INSERT(consented_at,notice_version) ON public.leads TO service_role;
GRANT UPDATE(name,email,phone,notes,status,score,score_reason,next_follow_up_at,anonymized_at,source_campaign,consented_at,notice_version) ON public.leads TO service_role;
GRANT UPDATE(trial_started_at) ON public.clients TO service_role;
GRANT DELETE ON public.lead_qualifications TO service_role;
CREATE FUNCTION public.merge_public_enquiry_consented(p_slug text,p_name text,p_email text,p_phone text,p_source text,p_campaign text) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE result jsonb;
BEGIN
 result=public.merge_public_enquiry_tracked(p_slug,p_name,p_email,p_phone,p_source,p_campaign);
 IF (result->>'merged')::boolean=false THEN UPDATE public.leads SET consented_at=now(),notice_version='pilot-2026-11-15' WHERE id=(result->>'lead_id')::uuid AND client_slug=p_slug; END IF;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.merge_public_enquiry_consented(text,text,text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.merge_public_enquiry_consented(text,text,text,text,text,text) TO service_role;
CREATE FUNCTION public.pilot_erase_enquiry_contacts(p_user uuid) RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE tenant text;n integer;
BEGIN
 IF NOT EXISTS(SELECT FROM auth.users WHERE id=p_user AND email_confirmed_at IS NOT NULL) THEN RAISE EXCEPTION 'Confirmed identity required'; END IF;
 SELECT slug INTO tenant FROM public.clients WHERE owner_user_id=p_user FOR UPDATE;
 IF tenant IS NULL THEN RAISE EXCEPTION 'Mapped owner required'; END IF;
 PERFORM id FROM public.automation_jobs WHERE client_slug=tenant FOR UPDATE;
 IF EXISTS(SELECT FROM public.automation_jobs WHERE client_slug=tenant AND status='processing' AND leased_until>now()) THEN RAISE EXCEPTION 'Active processing: retry after completion'; END IF;
 DELETE FROM public.automation_jobs WHERE client_slug=tenant AND lead_id IS NOT NULL;
 DELETE FROM public.lead_qualifications WHERE client_slug=tenant;
 UPDATE public.leads SET name='Deleted enquiry',email=NULL,phone=NULL,notes=NULL,source_campaign='',score=0,score_reason='Contact data erased by owner.',status='lost',next_follow_up_at=NULL,anonymized_at=now(),consented_at=NULL,notice_version=NULL
 WHERE (client_slug=tenant OR (client_slug IS NULL AND user_id=p_user)) AND anonymized_at IS NULL;
 GET DIAGNOSTICS n=ROW_COUNT;
 IF n>0 THEN INSERT INTO public.lead_activity(client_slug,actor_user_id,event,details) VALUES(tenant,p_user,'enquiry.contacts_erased',jsonb_build_object('count',n)); END IF;
 RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.pilot_erase_enquiry_contacts(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.pilot_erase_enquiry_contacts(uuid) TO service_role;
COMMIT;
