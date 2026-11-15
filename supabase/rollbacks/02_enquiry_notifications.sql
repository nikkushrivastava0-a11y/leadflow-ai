BEGIN;
DROP TRIGGER email_activity ON public.automation_jobs;
DROP FUNCTION leadflow_private.email_activity();
DROP TRIGGER enqueue_notifications ON public.leads;
DROP FUNCTION leadflow_private.enqueue_notifications();
DROP FUNCTION public.automation_prepare_email(uuid,uuid,jsonb);
DROP TABLE public.email_deliveries;
COMMIT;
