BEGIN;
DROP FUNCTION public.automation_schedule_weekly(),public.automation_weekly_metrics(text,timestamptz,timestamptz);
DROP INDEX public.leads_report_period;
DROP TABLE public.weekly_owner_reports;
DELETE FROM public.automation_jobs WHERE kind='weekly_report';
COMMIT;
