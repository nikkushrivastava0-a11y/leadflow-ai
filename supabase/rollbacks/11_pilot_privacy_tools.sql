BEGIN;
DROP FUNCTION public.pilot_erase_enquiry_contacts(uuid),public.merge_public_enquiry_consented(text,text,text,text,text,text);
ALTER TABLE public.leads DROP COLUMN consented_at,DROP COLUMN notice_version,DROP COLUMN anonymized_at;
-- Anonymized contact values cannot be restored by schema rollback.
COMMIT;
