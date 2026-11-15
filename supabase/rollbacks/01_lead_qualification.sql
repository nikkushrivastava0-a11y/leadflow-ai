BEGIN;
DROP TRIGGER enqueue_qualification ON public.leads;
DROP FUNCTION leadflow_private.enqueue_qualification();
DROP FUNCTION public.automation_claim(text[],integer),public.automation_finish(uuid,uuid,jsonb),public.automation_fail(uuid,uuid);
DROP TABLE public.lead_qualifications,public.lead_activity,public.automation_jobs;
COMMIT;
