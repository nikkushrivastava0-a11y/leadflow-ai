BEGIN;
DROP TRIGGER audit_lead_status ON public.leads;
DROP FUNCTION leadflow_private.audit_lead_status();
-- Keep activity history. Migration 01 owns the table.
COMMIT;
