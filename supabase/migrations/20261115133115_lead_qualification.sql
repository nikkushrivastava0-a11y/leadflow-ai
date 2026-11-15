-- REVIEW ONLY: requires PR #55 owner/RLS cutover first. Never auto-applied.
BEGIN;
DO $$ BEGIN
 IF current_setting('leadflow.feature_migrations',true) IS DISTINCT FROM 'REVIEWED' THEN RAISE EXCEPTION 'Reviewed migration approval required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='clients' AND column_name='owner_user_id') THEN RAISE EXCEPTION 'PR55 owner mapping required'; END IF;
END $$;
CREATE SCHEMA IF NOT EXISTS leadflow_private;
REVOKE ALL ON SCHEMA leadflow_private FROM PUBLIC,anon,authenticated;
CREATE TABLE public.automation_jobs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), dedupe_key text UNIQUE NOT NULL,
 kind text NOT NULL CHECK(kind IN ('qualification','customer_confirmation','owner_alert','followup','weekly_report')),
 client_slug text NOT NULL REFERENCES public.clients(slug), lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
 payload jsonb NOT NULL DEFAULT '{}', status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','done','dead')),
 attempts integer NOT NULL DEFAULT 0, available_at timestamptz NOT NULL DEFAULT now(),
 token uuid, leased_until timestamptz, created_at timestamptz NOT NULL DEFAULT now(), finished_at timestamptz
);
CREATE INDEX automation_pending ON public.automation_jobs(available_at,created_at) WHERE status IN ('pending','processing');
CREATE TABLE public.lead_activity (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), client_slug text NOT NULL REFERENCES public.clients(slug),
 lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL, actor_user_id uuid,
 event text NOT NULL, details jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX lead_activity_tenant_time ON public.lead_activity(client_slug,created_at DESC);
CREATE TABLE public.lead_qualifications (
 lead_id uuid PRIMARY KEY REFERENCES public.leads(id) ON DELETE CASCADE,
 client_slug text NOT NULL REFERENCES public.clients(slug), score integer NOT NULL CHECK(score BETWEEN 0 AND 100),
 fit text NOT NULL CHECK(fit IN ('low','medium','high')), summary text NOT NULL CHECK(length(summary) BETWEEN 1 AND 240),
 next_action text NOT NULL CHECK(length(next_action) BETWEEN 1 AND 240), engine text NOT NULL CHECK(engine IN ('rules','gemini')), created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.automation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_qualifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.automation_jobs,public.lead_activity,public.lead_qualifications FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.automation_jobs TO service_role;
GRANT SELECT,INSERT ON public.lead_activity TO service_role;
GRANT SELECT,INSERT,UPDATE ON public.lead_qualifications TO service_role;
GRANT SELECT ON public.lead_activity,public.lead_qualifications TO authenticated;
CREATE POLICY activity_owner ON public.lead_activity FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.clients c WHERE c.slug=client_slug AND c.owner_user_id=(SELECT auth.uid())));
CREATE POLICY qualification_owner ON public.lead_qualifications FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.clients c WHERE c.slug=client_slug AND c.owner_user_id=(SELECT auth.uid())));
-- Definer is necessary: authenticated lead inserts may enqueue but cannot write jobs.
-- Private, non-RPC trigger only; the initiating lead write has already passed RLS.
CREATE FUNCTION leadflow_private.enqueue_qualification() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 IF NEW.client_slug IS NOT NULL THEN
  INSERT INTO public.automation_jobs(dedupe_key,kind,client_slug,lead_id) VALUES('qualification:'||NEW.id,'qualification',NEW.client_slug,NEW.id);
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION leadflow_private.enqueue_qualification() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER enqueue_qualification AFTER INSERT ON public.leads FOR EACH ROW EXECUTE FUNCTION leadflow_private.enqueue_qualification();
CREATE FUNCTION public.automation_claim(p_kinds text[],p_limit integer DEFAULT 4) RETURNS SETOF public.automation_jobs
LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
 WITH exhausted AS (
  UPDATE public.automation_jobs SET status='dead',token=NULL,leased_until=NULL,finished_at=now()
  WHERE attempts>=6 AND status='processing' AND leased_until<now() RETURNING client_slug,lead_id,kind
 ), logged AS (
  INSERT INTO public.lead_activity(client_slug,lead_id,event,details)
  SELECT client_slug,lead_id,'automation.exhausted',jsonb_build_object('kind',kind) FROM exhausted RETURNING id
 )
 UPDATE public.automation_jobs j SET status='processing', attempts=attempts+1, token=gen_random_uuid(), leased_until=now()+interval '5 minutes'
 WHERE j.id IN (
  SELECT id FROM public.automation_jobs WHERE kind=ANY(p_kinds) AND attempts<6 AND available_at<=now()
   AND (status='pending' OR (status='processing' AND leased_until<now()))
  ORDER BY available_at,created_at FOR UPDATE SKIP LOCKED LIMIT greatest(1,least(p_limit,10))
 ) RETURNING j.*;
$$;
CREATE FUNCTION public.automation_finish(p_id uuid,p_token uuid,p_result jsonb) RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE j public.automation_jobs; v jsonb;
BEGIN
 SELECT * INTO j FROM public.automation_jobs WHERE id=p_id AND token=p_token AND status='processing' AND leased_until>now() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Stale job lease'; END IF;
 IF j.kind='qualification' AND NOT coalesce((p_result->>'skipped')::boolean,false) THEN
  v=p_result->'value';
  INSERT INTO public.lead_qualifications(lead_id,client_slug,score,fit,summary,next_action,engine)
   VALUES(j.lead_id,j.client_slug,(v->>'score')::integer,v->>'fit',v->>'summary',v->>'nextAction',p_result->>'engine')
   ON CONFLICT(lead_id) DO UPDATE SET score=EXCLUDED.score,fit=EXCLUDED.fit,summary=EXCLUDED.summary,next_action=EXCLUDED.next_action,engine=EXCLUDED.engine;
  UPDATE public.leads SET score=(v->>'score')::integer,score_reason=v->>'summary' WHERE id=j.lead_id AND client_slug=j.client_slug;
  INSERT INTO public.lead_activity(client_slug,lead_id,event,details) VALUES(j.client_slug,j.lead_id,
   CASE WHEN p_result->>'failure' IS NULL THEN 'qualification.completed' ELSE 'qualification.fallback' END,
   jsonb_build_object('engine',p_result->>'engine','failure',p_result->>'failure'));
 END IF;
 UPDATE public.automation_jobs SET status='done',finished_at=now(),token=NULL,leased_until=NULL WHERE id=j.id;
END $$;
CREATE FUNCTION public.automation_fail(p_id uuid,p_token uuid) RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE j public.automation_jobs;
BEGIN
 SELECT * INTO j FROM public.automation_jobs WHERE id=p_id AND token=p_token AND status='processing' AND leased_until>now() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Stale job lease'; END IF;
 UPDATE public.automation_jobs SET status=CASE WHEN attempts>=6 THEN 'dead' ELSE 'pending' END,
 available_at=now()+make_interval(secs=>least(3600,60*power(2,j.attempts)::integer)),token=NULL,leased_until=NULL WHERE id=j.id;
 INSERT INTO public.lead_activity(client_slug,lead_id,event,details) VALUES(j.client_slug,j.lead_id,'automation.failed',jsonb_build_object('kind',j.kind,'attempt',j.attempts));
END $$;
REVOKE ALL ON FUNCTION public.automation_claim(text[],integer),public.automation_finish(uuid,uuid,jsonb),public.automation_fail(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.automation_claim(text[],integer),public.automation_finish(uuid,uuid,jsonb),public.automation_fail(uuid,uuid) TO service_role;
COMMIT;
