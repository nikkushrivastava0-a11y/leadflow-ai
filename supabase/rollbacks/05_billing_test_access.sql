BEGIN;
DROP FUNCTION public.billing_test_record_failure(text,text,text,text,bigint,text),public.billing_test_reserve_attempt(uuid,uuid,text),public.billing_test_create_order(uuid,uuid,text,text,text,bigint,text,integer),public.billing_test_process_event(text,text,text,text,bigint,text,text);
DROP TABLE public.billing_test_failures,public.billing_test_entitlements,public.billing_test_events,public.billing_test_orders,public.billing_test_checkout_attempts;
COMMIT;
