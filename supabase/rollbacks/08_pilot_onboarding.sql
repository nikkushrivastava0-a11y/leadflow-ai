BEGIN;
DROP FUNCTION public.pilot_provision_workspace(uuid,text,text);
ALTER TABLE public.clients DROP COLUMN trial_started_at,DROP COLUMN trial_expires_at;
-- Provisioned businesses are preserved. Never remove owner mappings on rollback.
COMMIT;
