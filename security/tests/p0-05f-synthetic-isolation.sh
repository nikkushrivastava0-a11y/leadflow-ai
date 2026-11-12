#!/usr/bin/env bash
# P0-05f. DESTRUCTIVE SYNTHETIC TEST ONLY: disposable empty PostgreSQL database.
set -euo pipefail
[[ "${LEADFLOW_SYNTHETIC_ONLY:-}" == "YES" ]] || { echo 'Refusing: synthetic-only sentinel missing' >&2; exit 2; }
# Require an empty database to prevent accidentally touching existing customer tables.
preexisting="$(psql -X -qAt -v ON_ERROR_STOP=1 -c "SELECT count(*) FROM information_schema.tables WHERE table_schema IN ('public','auth','private') AND table_name IN ('clients','leads','leads_quarantine','users');")"
[[ "$preexisting" == "0" ]] || { echo 'Refusing: target database already contains protected tables' >&2; exit 2; }

psql -X -v ON_ERROR_STOP=1 <<'SQL' >/dev/null
BEGIN;
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE SCHEMA auth;
CREATE SCHEMA private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
CREATE TABLE auth.users(id uuid PRIMARY KEY,email text NOT NULL,email_confirmed_at timestamptz);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
$$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;
CREATE TABLE public.clients (id integer PRIMARY KEY,slug text UNIQUE NOT NULL,owner_user_id uuid NOT NULL);
CREATE TABLE public.leads (id uuid PRIMARY KEY,client_slug text,user_id uuid,name text NOT NULL);
CREATE TABLE private.leads_quarantine (LIKE public.leads INCLUDING ALL);
REVOKE ALL ON public.clients,public.leads FROM PUBLIC,anon,authenticated;
REVOKE ALL ON private.leads_quarantine FROM PUBLIC,anon,authenticated;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.leads_quarantine ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.clients,public.leads TO authenticated;
CREATE POLICY client_read ON public.clients FOR SELECT TO authenticated
 USING (owner_user_id=(SELECT auth.uid()));
CREATE POLICY lead_read ON public.leads FOR SELECT TO authenticated
 USING (client_slug IS NOT NULL AND EXISTS (
   SELECT 1 FROM public.clients c
   WHERE c.slug=leads.client_slug AND c.owner_user_id=(SELECT auth.uid())
 ));
INSERT INTO auth.users VALUES
 ('11111111-1111-1111-1111-111111111111','a@example.test',now()),
 ('22222222-2222-2222-2222-222222222222','b@example.test',now());
INSERT INTO public.clients VALUES
 (1,'a','11111111-1111-1111-1111-111111111111'),
 (2,'b','22222222-2222-2222-2222-222222222222');
INSERT INTO public.leads VALUES
 ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1','a',NULL,'Approved A'),
 ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1','b',NULL,'Approved B'),
 ('cccccccc-cccc-cccc-cccc-ccccccccccc1','missing',NULL,'Unknown slug'),
 ('cccccccc-cccc-cccc-cccc-ccccccccccc2',NULL,'99999999-9999-9999-9999-999999999999','Orphan legacy'),
 ('cccccccc-cccc-cccc-cccc-ccccccccccc3','b','11111111-1111-1111-1111-111111111111','Conflicting owner');
-- Simulate explicit administrative quarantine of review-flagged records ONLY.
-- This is not approved production SQL and NEVER runs against the real database.
WITH moved AS (
 DELETE FROM public.leads
 WHERE id IN ('cccccccc-cccc-cccc-cccc-ccccccccccc1',
              'cccccccc-cccc-cccc-cccc-ccccccccccc2',
              'cccccccc-cccc-cccc-cccc-ccccccccccc3')
 RETURNING *
)
INSERT INTO private.leads_quarantine SELECT * FROM moved;
COMMIT;
SQL

get_count() { psql -X -qAt -v ON_ERROR_STOP=1 -c "$1"; }
assert_eq() {
 local label="$1" expected="$2" actual="$3"
 [[ "$actual" == "$expected" ]] || { echo "FAIL: $label expected=$expected got=$actual" >&2; exit 1; }
 echo "PASS $label"
}
as_owner() {
 local owner="$1" sql="$2"
 psql -X -qAt -v ON_ERROR_STOP=1 <<SQL
SET ROLE authenticated;
SET request.jwt.claim.sub = '$owner';
$sql
SQL
}
must_deny() {
 local label="$1" role="$2" sql="$3"
 if psql -X -qAt -v ON_ERROR_STOP=1 <<SQL >/dev/null 2>&1
SET ROLE $role;
$sql
SQL
 then echo "FAIL: $label" >&2; exit 1; fi
 echo "PASS $label"
}
assert_eq "public rows" 2 "$(get_count 'SELECT count(*) FROM public.leads')"
assert_eq "quarantined rows" 3 "$(get_count 'SELECT count(*) FROM private.leads_quarantine')"
assert_eq "no records lost" 5 "$(get_count 'SELECT (SELECT count(*) FROM public.leads)+(SELECT count(*) FROM private.leads_quarantine)')"
assert_eq "owner A sees only own" 1 "$(as_owner '11111111-1111-1111-1111-111111111111' 'SELECT count(*) FROM public.leads;')"
assert_eq "owner B sees only own" 1 "$(as_owner '22222222-2222-2222-2222-222222222222' 'SELECT count(*) FROM public.leads;')"
assert_eq "A cannot see B" 0 "$(as_owner '11111111-1111-1111-1111-111111111111' "SELECT count(*) FROM public.leads WHERE client_slug='b';")"
assert_eq "B cannot see A" 0 "$(as_owner '22222222-2222-2222-2222-222222222222' "SELECT count(*) FROM public.leads WHERE client_slug='a';")"
assert_eq "A cannot see quarantined IDs in public" 0 "$(as_owner '11111111-1111-1111-1111-111111111111' "SELECT count(*) FROM public.leads WHERE id::text LIKE 'cccccccc-%';")"
must_deny "anon cannot read public leads" anon "SELECT count(*) FROM public.leads;"
# Direct authenticted use of private schema must be refused (no USAGE, no SELECT).
if psql -X -qAt -v ON_ERROR_STOP=1 <<'SQL' >/dev/null 2>&1
SET ROLE authenticated;
SET request.jwt.claim.sub='11111111-1111-1111-1111-111111111111';
SELECT count(*) FROM private.leads_quarantine;
SQL
then echo 'FAIL: authenticated read quarantined records' >&2; exit 1; fi
echo "PASS authenticated cannot read private quarantine"
must_deny "anon cannot read private quarantine" anon "SELECT count(*) FROM private.leads_quarantine;"
# Unauthorized write/DDL regression: no actor may manipulate quarantined data.
must_deny "anon cannot insert public lead" anon "INSERT INTO public.leads VALUES ('dddddddd-dddd-dddd-dddd-ddddddddddd1','a',NULL,'forbidden');"
must_deny "anon cannot update public lead" anon "UPDATE public.leads SET name='forbidden' WHERE client_slug='a';"
must_deny "anon cannot delete public lead" anon "DELETE FROM public.leads WHERE client_slug='a';"
must_deny "anon cannot truncate public leads" anon "TRUNCATE TABLE public.leads;"
must_deny "authenticated cannot insert into quarantine" authenticated "INSERT INTO private.leads_quarantine VALUES ('dddddddd-dddd-dddd-dddd-ddddddddddd2','a',NULL,'forbidden');"
must_deny "authenticated cannot update quarantine" authenticated "UPDATE private.leads_quarantine SET name='forbidden';"
must_deny "authenticated cannot delete quarantine" authenticated "DELETE FROM private.leads_quarantine;"
must_deny "authenticated cannot truncate quarantine" authenticated "TRUNCATE TABLE private.leads_quarantine;"
must_deny "authenticated cannot insert public lead with select-only grants" authenticated "INSERT INTO public.leads VALUES ('dddddddd-dddd-dddd-dddd-ddddddddddd3','b',NULL,'forbidden');"
must_deny "authenticated cannot delete public lead with select-only grants" authenticated "DELETE FROM public.leads;"
assert_eq "deny tests preserve public row count" 2 "$(get_count 'SELECT count(*) FROM public.leads')"
assert_eq "deny tests preserve quarantined row count" 3 "$(get_count 'SELECT count(*) FROM private.leads_quarantine')"

# Synthetic rollback rehearses restoring all original rows from the private quarantine.
psql -X -v ON_ERROR_STOP=1 <<'SQL' >/dev/null
BEGIN;
INSERT INTO public.leads SELECT * FROM private.leads_quarantine;
DELETE FROM private.leads_quarantine;
COMMIT;
SQL
assert_eq "rollback preserved all rows" 5 "$(get_count 'SELECT count(*) FROM public.leads')"
assert_eq "rollback cleared quarantine" 0 "$(get_count 'SELECT count(*) FROM private.leads_quarantine')"
# Ensure a user-ID conflict must not enable cross-tenant visibility.
assert_eq "A still cannot read conflicting B slug" 0 "$(as_owner '11111111-1111-1111-1111-111111111111' "SELECT count(*) FROM public.leads WHERE id='cccccccc-cccc-cccc-cccc-ccccccccccc3';")"
echo 'PASS synthetic isolation and rollback (NOT actual Supabase/JWT staging or production)'
