BEGIN;
DROP FUNCTION public.merge_public_enquiry(text,text,text,text);
DROP INDEX public.leads_duplicate_lookup;
ALTER TABLE public.leads DROP COLUMN enquiry_count,DROP COLUMN last_enquiry_at;
COMMIT;
