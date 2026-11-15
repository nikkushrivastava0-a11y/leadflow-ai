BEGIN;
DO $$BEGIN IF current_setting('leadflow.feature_migrations',true) IS DISTINCT FROM 'REVIEWED' THEN RAISE EXCEPTION 'Reviewed migration approval required'; END IF; END$$;
CREATE TABLE public.weekly_owner_reports (
 job_id uuid PRIMARY KEY REFERENCES public.automation_jobs(id) ON DELETE CASCADE,
 client_slug text NOT NULL REFERENCES public.clients(slug),period_start timestamptz NOT NULL,period_end timestamptz NOT NULL,
 metrics jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(client_slug,period_start),CHECK(period_end=period_start+interval '7 days')
);
ALTER TABLE public.weekly_owner_reports ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.weekly_owner_reports FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.weekly_owner_reports TO authenticated;
GRANT SELECT,INSERT ON public.weekly_owner_reports TO service_role;
CREATE POLICY reports_owner ON public.weekly_owner_reports FOR SELECT TO authenticated USING(EXISTS(SELECT FROM public.clients c WHERE c.slug=client_slug AND c.owner_user_id=(SELECT auth.uid())));
CREATE INDEX leads_report_period ON public.leads(client_slug,created_at);
CREATE FUNCTION public.automation_schedule_weekly() RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE e timestamptz=date_trunc('week',now() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata'; n integer;
BEGIN
 INSERT INTO public.automation_jobs(dedupe_key,kind,client_slug,payload)
 SELECT 'weekly:'||c.slug||':'||to_char(e AT TIME ZONE 'UTC','YYYYMMDD'),'weekly_report',c.slug,jsonb_build_object('start',e-interval '7 days','end',e)
 FROM public.clients c LEFT JOIN public.automation_settings s ON s.client_slug=c.slug
 WHERE c.owner_user_id IS NOT NULL AND coalesce(s.weekly_report_enabled,true)
 AND NOT EXISTS(SELECT FROM public.automation_jobs j WHERE j.dedupe_key='weekly:'||c.slug||':'||to_char(e AT TIME ZONE 'UTC','YYYYMMDD'))
 ORDER BY c.slug LIMIT 100 ON CONFLICT(dedupe_key) DO NOTHING;
 GET DIAGNOSTICS n=ROW_COUNT;RETURN n;
END $$;
CREATE FUNCTION public.automation_weekly_metrics(p_slug text,p_start timestamptz,p_end timestamptz) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE result jsonb;
BEGIN
 IF p_start IS NULL OR p_end IS NULL OR p_end<>p_start+interval '7 days' OR p_end>now() THEN RAISE EXCEPTION 'Invalid closed weekly period'; END IF;
 SELECT jsonb_build_object('total',count(*),'hot',count(*) FILTER(WHERE score>=70),'won',count(*) FILTER(WHERE status='won'),'unanswered',count(*) FILTER(WHERE status='new'),'average_score',coalesce(round(avg(score),1),0))
 INTO result FROM public.leads WHERE client_slug=p_slug AND created_at>=p_start AND created_at<p_end;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.automation_schedule_weekly(),public.automation_weekly_metrics(text,timestamptz,timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.automation_schedule_weekly(),public.automation_weekly_metrics(text,timestamptz,timestamptz) TO service_role;
COMMIT;
