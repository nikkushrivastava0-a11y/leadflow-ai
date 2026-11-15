BEGIN;
DO $$BEGIN IF current_setting('leadflow.feature_migrations',true) IS DISTINCT FROM 'REVIEWED' THEN RAISE EXCEPTION 'Reviewed migration approval required'; END IF; END$$;
CREATE TABLE public.email_deliveries (
 job_id uuid PRIMARY KEY REFERENCES public.automation_jobs(id) ON DELETE CASCADE,
 client_slug text NOT NULL REFERENCES public.clients(slug), message jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), provider_id text, sent_at timestamptz
);
ALTER TABLE public.email_deliveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.email_deliveries FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON public.email_deliveries TO service_role;
GRANT UPDATE(provider_id,sent_at) ON public.email_deliveries TO service_role;
CREATE FUNCTION public.automation_prepare_email(p_id uuid,p_token uuid,p_message jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE j public.automation_jobs; v public.email_deliveries;
BEGIN
 SELECT * INTO j FROM public.automation_jobs WHERE id=p_id AND token=p_token AND status='processing' AND leased_until>now() FOR UPDATE;
 IF NOT FOUND OR j.kind='qualification' THEN RAISE EXCEPTION 'Valid email job lease required'; END IF;
 INSERT INTO public.email_deliveries(job_id,client_slug,message) VALUES(j.id,j.client_slug,p_message) ON CONFLICT(job_id) DO NOTHING;
 SELECT * INTO v FROM public.email_deliveries WHERE job_id=j.id;
 RETURN to_jsonb(v);
END $$;
REVOKE ALL ON FUNCTION public.automation_prepare_email(uuid,uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.automation_prepare_email(uuid,uuid,jsonb) TO service_role;
CREATE FUNCTION leadflow_private.enqueue_notifications() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 IF NEW.client_slug IS NOT NULL THEN
  INSERT INTO public.automation_jobs(dedupe_key,kind,client_slug,lead_id) VALUES('owner_alert:'||NEW.id,'owner_alert',NEW.client_slug,NEW.id);
  IF NEW.email IS NOT NULL AND lower(NEW.source) IN ('website form','website') THEN
   INSERT INTO public.automation_jobs(dedupe_key,kind,client_slug,lead_id) VALUES('customer_confirmation:'||NEW.id,'customer_confirmation',NEW.client_slug,NEW.id);
  END IF;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION leadflow_private.enqueue_notifications() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER enqueue_notifications AFTER INSERT ON public.leads FOR EACH ROW EXECUTE FUNCTION leadflow_private.enqueue_notifications();
CREATE FUNCTION leadflow_private.email_activity() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 IF NEW.status='done' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.kind<>'qualification' THEN
  INSERT INTO public.lead_activity(client_slug,lead_id,event,details) VALUES(NEW.client_slug,NEW.lead_id,'email.job_completed',jsonb_build_object('kind',NEW.kind,'has_provider_receipt',EXISTS(SELECT FROM public.email_deliveries WHERE job_id=NEW.id AND provider_id IS NOT NULL)));
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION leadflow_private.email_activity() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER email_activity AFTER UPDATE ON public.automation_jobs FOR EACH ROW EXECUTE FUNCTION leadflow_private.email_activity();
COMMIT;
