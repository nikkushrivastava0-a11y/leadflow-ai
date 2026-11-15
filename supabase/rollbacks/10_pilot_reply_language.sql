BEGIN;
ALTER TABLE public.automation_settings DROP COLUMN reply_language;
COMMIT;
