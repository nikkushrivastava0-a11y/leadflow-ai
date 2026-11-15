BEGIN;
DROP FUNCTION public.automation_schedule_followups();
DROP INDEX public.unanswered_lead_age;
DROP TABLE public.followup_drafts,public.automation_settings;
DELETE FROM public.automation_jobs WHERE kind='followup';
COMMIT;
