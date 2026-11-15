#!/usr/bin/env bash
set -euo pipefail
# Requires an EMPTY disposable database. No hosted URL or customer fixtures.
[[ ${LEADFLOW_SYNTHETIC_ONLY:-} == YES ]] || { echo 'Synthetic flag required' >&2; exit 1; }
[[ ${PGHOST:-} == 127.0.0.1 || ${PGHOST:-} == localhost ]] || { echo 'Loopback PostgreSQL required' >&2; exit 1; }
q() { psql -X -qAt -v ON_ERROR_STOP=1 -c "$1"; }
[[ $(q "select count(*) from information_schema.tables where table_schema in ('public','auth')") == 0 ]] || { echo 'Empty disposable database required' >&2; exit 1; }
psql -X -q -v ON_ERROR_STOP=1 <<'SQL'
DO $$ BEGIN IF NOT EXISTS(SELECT FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF; IF NOT EXISTS(SELECT FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF; IF NOT EXISTS(SELECT FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF; END $$;
CREATE SCHEMA auth;
CREATE TABLE auth.users(id uuid primary key);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
GRANT USAGE ON SCHEMA auth,public TO anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;
CREATE TABLE public.clients(slug text primary key,owner_user_id uuid REFERENCES auth.users(id));
INSERT INTO auth.users VALUES('11111111-1111-1111-1111-111111111111'),('22222222-2222-2222-2222-222222222222');
INSERT INTO public.clients VALUES('synthetic-a','11111111-1111-1111-1111-111111111111'),('synthetic-b','22222222-2222-2222-2222-222222222222');
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY client_owners ON public.clients TO authenticated USING(owner_user_id=auth.uid());
GRANT SELECT ON public.clients TO authenticated,service_role;
SQL
if psql -X -q -v ON_ERROR_STOP=1 -f security/proposals/billing-test-ledger.sql >/dev/null 2>&1; then echo 'Migration bypassed sentinel' >&2; exit 1; fi
psql -X -q -v ON_ERROR_STOP=1 -c "set leadflow.billing_test_migration='APPROVED_LOCAL_TEST'" -f security/proposals/billing-test-ledger.sql >/dev/null
create_order() { q "set role service_role; select public.billing_test_reserve_attempt('$1','11111111-1111-1111-1111-111111111111','synthetic-a'); select public.billing_test_create_order('$1','11111111-1111-1111-1111-111111111111','synthetic-a','$2','pilot',12345,'INR',30);" >/dev/null; }
create_order 10000000-0000-0000-0000-000000000001 order_synthetic
create_order 10000000-0000-0000-0000-000000000002 order_other
process() { q "set role service_role; select public.billing_test_process_event('$1',repeat('$2',64),'$3','$4',$5,'$6','$7');"; }
expect_denied() { if q "$1" >/dev/null 2>&1; then echo "Expected denied: $2" >&2; exit 1; fi; }
expect_denied 'set role anon; select * from public.billing_test_orders;' 'anonymous read'
expect_denied "set role authenticated; select public.billing_test_process_event('evt_rogue',repeat('a',64),'order_synthetic','pay_synthetic',12345,'INR','captured');" 'authenticated RPC'
expect_denied "set role authenticated; insert into public.billing_test_entitlements values('10000000-0000-0000-0000-000000000001','test','11111111-1111-1111-1111-111111111111','synthetic-a','pilot','pay_fake',now(),now()+interval '1 day',null);" 'self-granted entitlement'
[[ $(q "set role authenticated; set request.jwt.claim.sub='22222222-2222-2222-2222-222222222222'; select count(*) from public.billing_test_orders;") == 0 ]]
[[ $(q "set role authenticated; set request.jwt.claim.sub='11111111-1111-1111-1111-111111111111'; select count(*) from public.billing_test_orders;") == 2 ]]
expect_denied "set role service_role; select public.billing_test_create_order('10000000-0000-0000-0000-000000000099','22222222-2222-2222-2222-222222222222','synthetic-a','order_forged','pilot',12345,'INR',30);" 'wrong owner mapping'
expect_denied "set role service_role; select public.billing_test_process_event('evt_null_amount',repeat('a',64),'order_synthetic','pay_synthetic',NULL,'INR','captured');" 'null amount'
expect_denied "set role service_role; select public.billing_test_process_event('evt_null_currency',repeat('a',64),'order_synthetic','pay_synthetic',12345,NULL,'captured');" 'null currency'
# Real parallel SQL sessions replay one event concurrently.
work=$(mktemp -d); trap 'rm -rf "$work"' EXIT
for i in $(seq 1 12); do process evt_capture a order_synthetic pay_synthetic 12345 INR captured >"$work/$i" & done
wait
[[ $(q 'select count(*) from public.billing_test_events') == 1 ]]
[[ $(q 'select count(*) from public.billing_test_entitlements') == 1 ]]
expiry=$(q 'select expires_at from public.billing_test_entitlements')
[[ $(process evt_capture a order_synthetic pay_synthetic 12345 INR captured) == duplicate ]]
[[ $(process evt_other b order_synthetic pay_synthetic 12345 INR captured) == applied ]]
[[ $(q 'select expires_at from public.billing_test_entitlements') == "$expiry" ]]
expect_denied "set role service_role; select public.billing_test_process_event('evt_capture',repeat('b',64),'order_synthetic','pay_synthetic',12345,'INR','captured');" 'event hash collision'
expect_denied "set role service_role; select public.billing_test_process_event('evt_wrong_amount',repeat('c',64),'order_synthetic','pay_synthetic',1,'INR','captured');" 'amount tampering'
expect_denied "set role service_role; select public.billing_test_process_event('evt_wrong_currency',repeat('c',64),'order_synthetic','pay_synthetic',12345,'USD','captured');" 'currency tampering'
expect_denied "set role service_role; select public.billing_test_process_event('evt_wrong_payment',repeat('c',64),'order_synthetic','pay_other',12345,'INR','captured');" 'second payment same order'
expect_denied "set role service_role; select public.billing_test_process_event('evt_reused_payment',repeat('c',64),'order_other','pay_synthetic',12345,'INR','captured');" 'payment replay different order'
[[ $(q "select count(*) from public.billing_test_events where event_id in ('evt_wrong_amount','evt_wrong_currency','evt_wrong_payment','evt_reused_payment')") == 0 ]]
[[ $(process evt_refund c order_synthetic pay_synthetic 12345 INR revoked) == revoked ]]
[[ $(process evt_delayed d order_synthetic pay_synthetic 12345 INR captured) == revoked ]]
[[ $(q 'select count(*) from public.billing_test_entitlements where revoked_at is null') == 0 ]]
# Revoke arrives before capture: no entitlement can ever be granted by stale capture.
[[ $(process evt_refund_first e order_other pay_other 12345 INR revoked) == revoked ]]
[[ $(process evt_capture_late f order_other pay_other 12345 INR captured) == revoked ]]
[[ $(q "select count(*) from public.billing_test_entitlements where payment_id='pay_other'") == 0 ]]
# Force an entitlement write failure. Event/order mutations must roll back together.
create_order 10000000-0000-0000-0000-000000000003 order_retry
q "create function public.synthetic_fail_entitlement() returns trigger language plpgsql as \$\$ begin raise exception 'synthetic write failure'; end \$\$; create trigger synthetic_failure before insert on public.billing_test_entitlements for each row execute function public.synthetic_fail_entitlement();" >/dev/null
expect_denied "set role service_role; select public.billing_test_process_event('evt_retry',repeat('a',64),'order_retry','pay_retry',12345,'INR','captured');" 'atomic failure'
[[ $(q "select count(*) from public.billing_test_events where event_id='evt_retry'") == 0 ]]
[[ $(q "select state from public.billing_test_orders where provider_order_id='order_retry'") == created ]]
q 'drop trigger synthetic_failure on public.billing_test_entitlements; drop function public.synthetic_fail_entitlement();' >/dev/null
[[ $(process evt_retry a order_retry pay_retry 12345 INR captured) == applied ]]
[[ $(q "select count(*) from public.billing_test_entitlements where payment_id='pay_retry'") == 1 ]]
# Reservation throttling is atomic across concurrent sessions, before provider calls.
for i in $(seq 1 12); do
 (if q "set role service_role; select public.billing_test_reserve_attempt(gen_random_uuid(),'11111111-1111-1111-1111-111111111111','synthetic-a');" >/dev/null 2>&1; then echo ok; else echo denied; fi) >"$work/limit-$i" &
done
wait
[[ $(awk '$0=="ok" {n++} END {print n+0}' "$work"/limit-*) == 7 ]]
[[ $(q 'select count(*) from public.billing_test_checkout_attempts') == 10 ]]
expect_denied "set role authenticated; select public.billing_test_reserve_attempt(gen_random_uuid(),'11111111-1111-1111-1111-111111111111','synthetic-a');" 'owner reservation RPC'
echo 'PASS: billing SQL owner RLS, service-only writes, 12 concurrent replays, fixed expiry, collision/amount/currency/payment denials, refund tombstones, atomic rollback + retry, concurrent pre-provider throttle'
