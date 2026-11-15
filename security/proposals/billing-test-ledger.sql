-- PROPOSAL ONLY: apply only to an explicitly approved disposable LOCAL database.
-- No production migration hook; no live mode/entitlements exist in this schema.
BEGIN;
DO $$ BEGIN
 IF current_setting('leadflow.billing_test_migration',true) IS DISTINCT FROM 'APPROVED_LOCAL_TEST' THEN RAISE EXCEPTION 'Explicit local test approval required'; END IF;
 IF to_regclass('public.billing_test_orders') IS NOT NULL THEN RAISE EXCEPTION 'Existing ledger: inspect rather than overwrite'; END IF;
END $$;
CREATE TABLE public.billing_test_checkout_attempts (
 id uuid PRIMARY KEY, owner_user_id uuid NOT NULL REFERENCES auth.users(id), client_slug text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX billing_test_attempt_owner_created ON public.billing_test_checkout_attempts(owner_user_id,created_at);
ALTER TABLE public.billing_test_checkout_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.billing_test_checkout_attempts FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON public.billing_test_checkout_attempts TO service_role;
CREATE TABLE public.billing_test_orders (
 id uuid PRIMARY KEY,
 mode text NOT NULL DEFAULT 'test' CHECK(mode='test'),
 owner_user_id uuid NOT NULL REFERENCES auth.users(id),
 client_slug text NOT NULL,
 provider_order_id text NOT NULL UNIQUE CHECK(provider_order_id ~ '^order_[A-Za-z0-9_]+$'),
 plan text NOT NULL CHECK(plan ~ '^[a-z][a-z0-9_-]{0,39}$'),
 amount bigint NOT NULL CHECK(amount BETWEEN 100 AND 10000000),
 currency text NOT NULL CHECK(currency='INR'),
 duration_days integer NOT NULL CHECK(duration_days BETWEEN 1 AND 366),
 payment_id text UNIQUE CHECK(payment_id IS NULL OR payment_id ~ '^pay_[A-Za-z0-9_]+$'),
 state text NOT NULL DEFAULT 'created' CHECK(state IN ('created','captured','revoked')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX billing_test_owner_created ON public.billing_test_orders(owner_user_id,created_at);
CREATE TABLE public.billing_test_events (
 event_id text PRIMARY KEY CHECK(length(event_id) BETWEEN 1 AND 128),
 body_hash text NOT NULL CHECK(body_hash ~ '^[a-f0-9]{64}$'),
 order_id uuid NOT NULL REFERENCES public.billing_test_orders(id),
 payment_id text NOT NULL,
 state text NOT NULL CHECK(state IN ('captured','revoked')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.billing_test_entitlements (
 order_id uuid PRIMARY KEY REFERENCES public.billing_test_orders(id),
 mode text NOT NULL DEFAULT 'test' CHECK(mode='test'),
 owner_user_id uuid NOT NULL REFERENCES auth.users(id),
 client_slug text NOT NULL,
 plan text NOT NULL,
 payment_id text NOT NULL UNIQUE,
 granted_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL,
 revoked_at timestamptz
);
ALTER TABLE public.billing_test_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_test_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_test_entitlements ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.billing_test_orders, public.billing_test_events, public.billing_test_entitlements FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.billing_test_orders, public.billing_test_entitlements TO authenticated;
GRANT SELECT,INSERT,UPDATE ON public.billing_test_orders, public.billing_test_events, public.billing_test_entitlements TO service_role;
CREATE POLICY billing_test_owner_orders ON public.billing_test_orders FOR SELECT TO authenticated USING (
 owner_user_id=(SELECT auth.uid()) AND EXISTS(SELECT 1 FROM public.clients c WHERE c.slug=client_slug AND c.owner_user_id=(SELECT auth.uid()))
);
CREATE POLICY billing_test_owner_entitlements ON public.billing_test_entitlements FOR SELECT TO authenticated USING (
 owner_user_id=(SELECT auth.uid()) AND EXISTS(SELECT 1 FROM public.clients c WHERE c.slug=client_slug AND c.owner_user_id=(SELECT auth.uid()))
);
CREATE FUNCTION public.billing_test_reserve_attempt(p_id uuid,p_owner uuid,p_slug text)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.clients WHERE slug=p_slug AND owner_user_id=p_owner) THEN RAISE EXCEPTION 'Verified owner mapping required'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_owner::text,0));
 IF (SELECT count(*) FROM public.billing_test_checkout_attempts WHERE owner_user_id=p_owner AND created_at>now()-interval '1 hour') >= 10 THEN RAISE EXCEPTION 'Test checkout attempt limit reached'; END IF;
 INSERT INTO public.billing_test_checkout_attempts(id,owner_user_id,client_slug) VALUES(p_id,p_owner,p_slug);
END $$;
CREATE FUNCTION public.billing_test_create_order(p_id uuid,p_owner uuid,p_slug text,p_provider_order text,p_plan text,p_amount bigint,p_currency text,p_duration integer)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.clients WHERE slug=p_slug AND owner_user_id=p_owner) THEN RAISE EXCEPTION 'Verified owner mapping required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.billing_test_checkout_attempts WHERE id=p_id AND owner_user_id=p_owner AND client_slug=p_slug) THEN RAISE EXCEPTION 'Durable checkout reservation required'; END IF;
 INSERT INTO public.billing_test_orders(id,owner_user_id,client_slug,provider_order_id,plan,amount,currency,duration_days) VALUES(p_id,p_owner,p_slug,p_provider_order,p_plan,p_amount,p_currency,p_duration);
END $$;
CREATE FUNCTION public.billing_test_process_event(p_event text,p_hash text,p_provider_order text,p_payment text,p_amount bigint,p_currency text,p_state text)
RETURNS text LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE o public.billing_test_orders%ROWTYPE; e public.billing_test_events%ROWTYPE;
BEGIN
 IF p_state IS NULL OR p_state NOT IN ('captured','revoked') OR p_payment IS NULL OR p_payment !~ '^pay_[A-Za-z0-9_]+$' OR p_amount IS NULL OR p_amount<100 OR p_currency IS DISTINCT FROM 'INR' THEN RAISE EXCEPTION 'Invalid event'; END IF;
 SELECT * INTO o FROM public.billing_test_orders WHERE provider_order_id=p_provider_order FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Unknown stored order'; END IF;
 IF o.amount<>p_amount OR o.currency<>p_currency THEN RAISE EXCEPTION 'Order amount or currency mismatch'; END IF;
 IF o.payment_id IS NOT NULL AND o.payment_id<>p_payment THEN RAISE EXCEPTION 'Order already has another payment'; END IF;
 IF p_state='captured' AND NOT EXISTS(SELECT 1 FROM public.clients WHERE slug=o.client_slug AND owner_user_id=o.owner_user_id) THEN RAISE EXCEPTION 'Order owner mapping changed'; END IF;
 INSERT INTO public.billing_test_events(event_id,body_hash,order_id,payment_id,state) VALUES(p_event,p_hash,o.id,p_payment,p_state) ON CONFLICT(event_id) DO NOTHING;
 IF NOT FOUND THEN
  SELECT * INTO e FROM public.billing_test_events WHERE event_id=p_event;
  IF e.body_hash<>p_hash OR e.order_id<>o.id OR e.payment_id<>p_payment OR e.state<>p_state THEN RAISE EXCEPTION 'Event ID collision'; END IF;
  RETURN 'duplicate';
 END IF;
 -- An irreversible refund tombstone prevents delayed captured events granting access.
 IF o.state='revoked' THEN RETURN 'revoked'; END IF;
 UPDATE public.billing_test_orders SET payment_id=p_payment,state=p_state WHERE id=o.id;
 IF p_state='revoked' THEN
  UPDATE public.billing_test_entitlements SET revoked_at=coalesce(revoked_at,now()) WHERE order_id=o.id;
  RETURN 'revoked';
 END IF;
 INSERT INTO public.billing_test_entitlements(order_id,owner_user_id,client_slug,plan,payment_id,expires_at)
 VALUES(o.id,o.owner_user_id,o.client_slug,o.plan,p_payment,now()+make_interval(days=>o.duration_days)) ON CONFLICT(order_id) DO NOTHING;
 RETURN 'applied';
END $$;
REVOKE ALL ON FUNCTION public.billing_test_reserve_attempt(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.billing_test_reserve_attempt(uuid,uuid,text) TO service_role;
REVOKE ALL ON FUNCTION public.billing_test_create_order(uuid,uuid,text,text,text,bigint,text,integer) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.billing_test_process_event(text,text,text,text,bigint,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.billing_test_create_order(uuid,uuid,text,text,text,bigint,text,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.billing_test_process_event(text,text,text,text,bigint,text,text) TO service_role;
COMMIT;
