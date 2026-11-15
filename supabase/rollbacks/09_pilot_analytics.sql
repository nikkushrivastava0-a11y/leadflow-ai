BEGIN;
DROP FUNCTION public.merge_public_enquiry_tracked(text,text,text,text,text,text),public.pilot_export_leads(text),public.pilot_analytics(text);
DROP TRIGGER first_status_response ON public.leads;
DROP FUNCTION leadflow_private.first_status_response();
ALTER TABLE public.leads DROP COLUMN source_detail,DROP COLUMN source_campaign,DROP COLUMN first_contacted_at;
COMMIT;
