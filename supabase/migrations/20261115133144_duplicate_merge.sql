BEGIN;
DO $$BEGIN IF current_setting('leadflow.feature_migrations',true) IS DISTINCT FROM 'REVIEWED' THEN RAISE EXCEPTION 'Reviewed migration approval required'; END IF; END$$;
ALTER TABLE public.leads ADD COLUMN enquiry_count integer NOT NULL DEFAULT 1 CHECK(enquiry_count>0), ADD COLUMN last_enquiry_at timestamptz;
CREATE INDEX leads_duplicate_lookup ON public.leads(client_slug,lower(trim(email)),created_at DESC);
CREATE FUNCTION public.merge_public_enquiry(p_slug text,p_name text,p_email text,p_phone text) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE e text=lower(trim(p_email)); ph text=regexp_replace(p_phone,'[^0-9]','','g'); existing uuid;
BEGIN
 IF length(ph)=12 AND left(ph,2)='91' THEN ph=right(ph,10); END IF;
 IF p_slug IS NULL OR p_slug!~'^[a-z0-9][a-z0-9-]{0,79}$' OR p_name IS NULL OR length(trim(p_name)) NOT BETWEEN 2 AND 100
 OR e IS NULL OR length(e)>254 OR e!~'^[^[:space:]@<>]+@[^[:space:]@<>]+\.[^[:space:]@<>]+$'
 OR ph IS NULL OR length(ph) NOT BETWEEN 10 AND 15 THEN RAISE EXCEPTION 'Invalid enquiry'; END IF;
 IF NOT EXISTS(SELECT FROM public.clients WHERE slug=p_slug AND owner_user_id IS NOT NULL) THEN RAISE EXCEPTION 'Unprovisioned business'; END IF;
 -- Same tenant + BOTH normalized contacts required. Never merge by name alone.
 PERFORM pg_advisory_xact_lock(hashtextextended(p_slug||chr(31)||e||chr(31)||ph,0));
 SELECT l.id INTO existing FROM public.leads l WHERE l.client_slug=p_slug AND lower(trim(l.email))=e
 AND (CASE WHEN length(regexp_replace(l.phone,'[^0-9]','','g'))=12 AND left(regexp_replace(l.phone,'[^0-9]','','g'),2)='91'
 THEN right(regexp_replace(l.phone,'[^0-9]','','g'),10) ELSE regexp_replace(l.phone,'[^0-9]','','g') END)=ph
 AND l.created_at>now()-interval '7 days' ORDER BY l.created_at DESC,l.id LIMIT 1 FOR UPDATE;
 IF existing IS NOT NULL THEN
  UPDATE public.leads SET enquiry_count=enquiry_count+1,last_enquiry_at=now() WHERE id=existing;
  INSERT INTO public.lead_activity(client_slug,lead_id,event) VALUES(p_slug,existing,'enquiry.duplicate_merged');
  RETURN jsonb_build_object('lead_id',existing,'merged',true);
 END IF;
 INSERT INTO public.leads(client_slug,name,email,phone,source,status,score,score_reason,last_enquiry_at)
 VALUES(p_slug,trim(p_name),e,ph,'Website Form','new',50,'Unscored enquiry (AI analysis has not run).',now()) RETURNING id INTO existing;
 RETURN jsonb_build_object('lead_id',existing,'merged',false);
END $$;
REVOKE ALL ON FUNCTION public.merge_public_enquiry(text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.merge_public_enquiry(text,text,text,text) TO service_role;
GRANT UPDATE(enquiry_count,last_enquiry_at) ON public.leads TO service_role;
COMMIT;
