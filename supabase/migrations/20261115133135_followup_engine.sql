BEGIN;
DO $$BEGIN IF current_setting('leadflow.feature_migrations',true) IS DISTINCT FROM 'REVIEWED' THEN RAISE EXCEPTION 'Reviewed migration approval required'; END IF; END$$;
CREATE TABLE public.automation_settings (
 client_slug text PRIMARY KEY REFERENCES public.clients(slug), brand_voice text NOT NULL DEFAULT 'friendly' CHECK(brand_voice IN ('friendly','professional','concise')),
 language text NOT NULL DEFAULT 'english' CHECK(language IN ('english','hinglish')), followups_enabled boolean NOT NULL DEFAULT true, weekly_report_enabled boolean NOT NULL DEFAULT true
);
CREATE TABLE public.followup_drafts (
 job_id uuid PRIMARY KEY REFERENCES public.automation_jobs(id) ON DELETE CASCADE, lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
 client_slug text NOT NULL REFERENCES public.clients(slug), text text NOT NULL CHECK(length(text) BETWEEN 1 AND 500), engine text NOT NULL CHECK(engine IN ('rules','gemini')), created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.automation_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.followup_drafts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.automation_settings,public.followup_drafts FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.automation_settings TO authenticated,service_role;
GRANT SELECT ON public.followup_drafts TO authenticated;
GRANT SELECT,INSERT ON public.followup_drafts TO service_role;
CREATE POLICY settings_owner ON public.automation_settings FOR ALL TO authenticated USING(EXISTS(SELECT FROM public.clients c WHERE c.slug=client_slug AND c.owner_user_id=(SELECT auth.uid()))) WITH CHECK(EXISTS(SELECT FROM public.clients c WHERE c.slug=client_slug AND c.owner_user_id=(SELECT auth.uid())));
CREATE POLICY draft_owner ON public.followup_drafts FOR SELECT TO authenticated USING(EXISTS(SELECT FROM public.clients c WHERE c.slug=client_slug AND c.owner_user_id=(SELECT auth.uid())));
CREATE INDEX unanswered_lead_age ON public.leads(created_at,client_slug) WHERE status='new';
CREATE FUNCTION public.automation_schedule_followups() RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE n integer;
BEGIN
 INSERT INTO public.automation_jobs(dedupe_key,kind,client_slug,lead_id,payload)
 SELECT 'followup:'||l.id||':'||d.stage,'followup',l.client_slug,l.id,jsonb_build_object('stage',d.stage)
 FROM public.leads l JOIN public.clients c ON c.slug=l.client_slug
 LEFT JOIN public.automation_settings s ON s.client_slug=l.client_slug
 CROSS JOIN LATERAL(SELECT CASE WHEN l.created_at<=now()-interval '7 days' THEN 168 WHEN l.created_at<=now()-interval '3 days' THEN 72 ELSE 24 END stage) d
 WHERE l.status='new' AND l.created_at<=now()-interval '24 hours' AND l.created_at>now()-interval '10 days' AND coalesce(s.followups_enabled,true)
 AND NOT EXISTS(SELECT FROM public.automation_jobs j WHERE j.dedupe_key='followup:'||l.id||':'||d.stage)
 ORDER BY l.created_at LIMIT 100 ON CONFLICT(dedupe_key) DO NOTHING;
 GET DIAGNOSTICS n=ROW_COUNT; RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.automation_schedule_followups() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.automation_schedule_followups() TO service_role;
COMMIT;
