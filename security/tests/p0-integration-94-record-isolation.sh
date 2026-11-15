#!/usr/bin/env bash
# SYNTHETIC ONLY: never run against a real existing database.
set -euo pipefail
[[ "$LEADFLOW_SYNTHETIC_ONLY" == "YES" ]] || exit 2
exists=$(psql -X -qAt -v ON_ERROR_STOP=1 -c "select count(*) from information_schema.tables where table_name in ('leads','clients','leads_quarantine','users') and table_schema in ('public','private','auth')")
[[ "$exists" == "0" ]] || { echo "Refusing to touch existing tables" >&2; exit 2; }
psql -X -q -v ON_ERROR_STOP=1 <<'SQL'
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE SCHEMA auth;
CREATE SCHEMA private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
$$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;
CREATE TABLE auth.users(id uuid PRIMARY KEY,email text NOT NULL,email_confirmed_at timestamptz);
CREATE TABLE public.clients(id bigint PRIMARY KEY,slug text UNIQUE NOT NULL,owner_user_id uuid NOT NULL);
CREATE TABLE public.leads(id uuid PRIMARY KEY,user_id uuid,client_slug text,name text NOT NULL);
CREATE TABLE private.leads_quarantine(LIKE public.leads INCLUDING ALL);
REVOKE ALL ON public.clients,public.leads,private.leads_quarantine FROM PUBLIC,anon,authenticated;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.leads_quarantine ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.clients,public.leads TO authenticated;
CREATE POLICY client_read ON public.clients FOR SELECT TO authenticated USING (owner_user_id=(SELECT auth.uid()));
CREATE POLICY lead_read ON public.leads FOR SELECT TO authenticated USING (
 (client_slug IS NOT NULL AND EXISTS(SELECT 1 FROM public.clients c WHERE c.slug=leads.client_slug AND c.owner_user_id=(SELECT auth.uid())))
 OR (client_slug IS NULL AND user_id=(SELECT auth.uid()) AND EXISTS(SELECT 1 FROM public.clients c WHERE c.owner_user_id=(SELECT auth.uid())))
);
INSERT INTO auth.users VALUES
('11111111-1111-1111-1111-111111111111','a@example.test',now()),
('22222222-2222-2222-2222-222222222222','b@example.test',now());
INSERT INTO public.clients VALUES
(1,'a','11111111-1111-1111-1111-111111111111'),
(2,'b','22222222-2222-2222-2222-222222222222');
INSERT INTO public.leads
SELECT md5('good-'||i)::uuid,NULL,CASE WHEN i=38 THEN 'b' ELSE 'a' END,'Valid slug'
FROM generate_series(1,38) i;
INSERT INTO public.leads
SELECT md5('legacy-good-'||i)::uuid,'11111111-1111-1111-1111-111111111111',NULL,'Legacy owned'
FROM generate_series(1,17) i;
INSERT INTO public.leads
SELECT md5('legacy-bad-'||i)::uuid,md5('missing-user-'||i)::uuid,NULL,'Legacy unresolved'
FROM generate_series(1,34) i;
INSERT INTO public.leads
SELECT md5('orphan-slug-'||i)::uuid,NULL,'unknown-'||(i%3),'Unknown slug'
FROM generate_series(1,5) i;
SQL
countq() { psql -X -qAt -v ON_ERROR_STOP=1 -c "$1"; }
assert() {
  if [[ "$2" != "$3" ]]; then echo "FAIL $1 expected=$2 got=$3" >&2; exit 1; fi
  echo "PASS $1"
}
assert initial_94 94 "$(countq 'select count(*) from public.leads')"
original=$(countq "select md5(string_agg(id::text||':'||coalesce(user_id::text,'null')||':'||coalesce(client_slug,'null'),',' order by id)) from public.leads")
psql -X -q -v ON_ERROR_STOP=1 <<'SQL'
BEGIN;
WITH moved AS (
DELETE FROM public.leads l WHERE
  (l.client_slug IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.clients c WHERE c.slug=l.client_slug))
  OR (l.client_slug IS NULL AND NOT EXISTS(
      SELECT 1 FROM auth.users u JOIN public.clients c ON u.id=c.owner_user_id
      WHERE u.id=l.user_id AND u.email_confirmed_at IS NOT NULL))
RETURNING l.*
) INSERT INTO private.leads_quarantine SELECT * FROM moved;
COMMIT;
SQL
assert public_55 55 "$(countq 'select count(*) from public.leads')"
assert quarantine_39 39 "$(countq 'select count(*) from private.leads_quarantine')"
assert all_preserved 94 "$(countq 'select (select count(*) from public.leads)+(select count(*) from private.leads_quarantine)')"
owner_count() {
psql -X -qAt -v ON_ERROR_STOP=1 <<SQL
SET ROLE authenticated;
SET request.jwt.claim.sub='$1';
SELECT count(*) FROM public.leads;
SQL
}
assert owner_a_54 54 "$(owner_count '11111111-1111-1111-1111-111111111111')"
assert owner_b_1 1 "$(owner_count '22222222-2222-2222-2222-222222222222')"
deny() {
if psql -X -qAt -v ON_ERROR_STOP=1 <<SQL >/dev/null 2>&1
SET ROLE $1;
$2
SQL
then echo "FAIL unauthorized $1 $2" >&2; exit 1; fi
echo "PASS unauthorized action denied"
}
deny anon "SELECT count(*) FROM public.leads;"
deny anon "SELECT count(*) FROM private.leads_quarantine;"
deny authenticated "SELECT count(*) FROM private.leads_quarantine;"
deny authenticated "UPDATE private.leads_quarantine SET name='attack';"
deny authenticated "DELETE FROM private.leads_quarantine;"
deny authenticated "INSERT INTO private.leads_quarantine VALUES(gen_random_uuid(),NULL,NULL,'attack');"
deny anon "TRUNCATE public.leads;"
assert quarantine_unchanged 39 "$(countq 'select count(*) from private.leads_quarantine')"
psql -X -q -v ON_ERROR_STOP=1 <<'SQL'
BEGIN;
INSERT INTO public.leads SELECT * FROM private.leads_quarantine;
DELETE FROM private.leads_quarantine;
COMMIT;
SQL
assert rollback_94 94 "$(countq 'select count(*) from public.leads')"
assert rollback_quarantine_empty 0 "$(countq 'select count(*) from private.leads_quarantine')"
restored=$(countq "select md5(string_agg(id::text||':'||coalesce(user_id::text,'null')||':'||coalesce(client_slug,'null'),',' order by id)) from public.leads")
assert exact_rollback "$original" "$restored"
echo "PASS disposable PostgreSQL contract; NOT actual Supabase Auth staging"
