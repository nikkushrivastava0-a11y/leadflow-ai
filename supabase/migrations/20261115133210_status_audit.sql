BEGIN;
DO $$BEGIN IF current_setting('leadflow.feature_migrations',true) IS DISTINCT FROM 'REVIEWED' THEN RAISE EXCEPTION 'Reviewed migration approval required'; END IF; END$$;
-- Private trigger is needed to write append-only activity from owner-scoped CRM writes.
CREATE FUNCTION leadflow_private.audit_lead_status() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE tenant text=NEW.client_slug;
BEGIN
 IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
 IF tenant IS NULL THEN SELECT c.slug INTO tenant FROM public.clients c WHERE c.owner_user_id=NEW.user_id; END IF;
 IF tenant IS NULL THEN RAISE EXCEPTION 'Status audit requires a mapped business'; END IF;
 INSERT INTO public.lead_activity(client_slug,lead_id,actor_user_id,event,details)
 VALUES(tenant,NEW.id,auth.uid(),'lead.status_changed',jsonb_build_object('from',OLD.status,'to',NEW.status));
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION leadflow_private.audit_lead_status() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER audit_lead_status AFTER UPDATE OF status ON public.leads FOR EACH ROW EXECUTE FUNCTION leadflow_private.audit_lead_status();
COMMIT;
