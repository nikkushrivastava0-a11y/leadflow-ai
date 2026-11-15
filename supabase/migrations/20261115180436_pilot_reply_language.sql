BEGIN;
DO $$BEGIN IF current_setting('leadflow.feature_migrations',true) IS DISTINCT FROM 'REVIEWED' THEN RAISE EXCEPTION 'Reviewed migration required'; END IF; END$$;
ALTER TABLE public.automation_settings ADD COLUMN reply_language text CHECK(reply_language IN ('english','hinglish','hindi'));
COMMIT;
