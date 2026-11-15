BEGIN;
DO $$BEGIN IF current_setting('leadflow.feature_migrations',true) IS DISTINCT FROM 'REVIEWED' THEN RAISE EXCEPTION 'Reviewed migration required'; END IF; END$$;
ALTER TABLE public.leads ADD COLUMN source_detail text NOT NULL DEFAULT 'website', ADD COLUMN source_campaign text NOT NULL DEFAULT '', ADD COLUMN first_contacted_at timestamptz;
CREATE FUNCTION leadflow_private.first_status_response() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
BEGIN
 IF OLD.status='new' AND NEW.status IS DISTINCT FROM OLD.status AND NEW.first_contacted_at IS NULL THEN NEW.first_contacted_at=now(); END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION leadflow_private.first_status_response() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER first_status_response BEFORE UPDATE OF status ON public.leads FOR EACH ROW EXECUTE FUNCTION leadflow_private.first_status_response();
CREATE FUNCTION public.pilot_analytics(p_slug text) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE result jsonb; sources jsonb;
BEGIN
 IF NOT EXISTS(SELECT FROM public.clients WHERE slug=p_slug AND owner_user_id=auth.uid()) THEN RAISE EXCEPTION 'Owner scope required'; END IF;
 SELECT jsonb_build_object('leads',count(*),'won',count(*) FILTER(WHERE status='won'),'conversion_percent',CASE WHEN count(*)=0 THEN 0 ELSE round(100.0*count(*) FILTER(WHERE status='won')/count(*),1) END,'response_seconds',round(avg(greatest(0,extract(epoch FROM first_contacted_at-created_at))) FILTER(WHERE first_contacted_at IS NOT NULL))) INTO result
 FROM public.leads WHERE (client_slug=p_slug OR (client_slug IS NULL AND user_id=auth.uid())) AND created_at>=now()-interval '30 days';
 SELECT coalesce(jsonb_object_agg(source_detail,n),'{}') INTO sources FROM(SELECT source_detail,count(*) n FROM public.leads WHERE (client_slug=p_slug OR (client_slug IS NULL AND user_id=auth.uid())) AND created_at>=now()-interval '30 days' GROUP BY source_detail) s;
 RETURN result||jsonb_build_object('sources',sources);
END $$;
CREATE FUNCTION public.pilot_export_leads(p_slug text) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE result jsonb;
BEGIN
 IF NOT EXISTS(SELECT FROM public.clients WHERE slug=p_slug AND owner_user_id=auth.uid()) THEN RAISE EXCEPTION 'Owner scope required'; END IF;
 IF (SELECT count(*) FROM public.leads WHERE client_slug=p_slug OR (client_slug IS NULL AND user_id=auth.uid()))>10000 THEN RAISE EXCEPTION 'Export exceeds 10000 leads'; END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.created_at),'[]') INTO result FROM(SELECT name,email,phone,source,source_detail,source_campaign,status,score,notes,created_at,next_follow_up_at,first_contacted_at FROM public.leads WHERE client_slug=p_slug OR (client_slug IS NULL AND user_id=auth.uid())) x;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.pilot_analytics(text),public.pilot_export_leads(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.pilot_analytics(text),public.pilot_export_leads(text) TO authenticated;
CREATE FUNCTION public.merge_public_enquiry_tracked(p_slug text,p_name text,p_email text,p_phone text,p_source text,p_campaign text) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE result jsonb;
BEGIN
 IF p_source IS NULL OR p_source NOT IN ('website','google','instagram','facebook','whatsapp','referral','other') OR p_campaign IS NULL OR length(p_campaign)>80 OR p_campaign!~'^[a-zA-Z0-9 _-]*$' THEN RAISE EXCEPTION 'Invalid attribution'; END IF;
 result=public.merge_public_enquiry(p_slug,p_name,p_email,p_phone);
 IF (result->>'merged')::boolean=false THEN UPDATE public.leads SET source_detail=p_source,source_campaign=p_campaign WHERE id=(result->>'lead_id')::uuid AND client_slug=p_slug; END IF;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.merge_public_enquiry_tracked(text,text,text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.merge_public_enquiry_tracked(text,text,text,text,text,text) TO service_role;
GRANT UPDATE(source_detail,source_campaign) ON public.leads TO service_role;
COMMIT;
