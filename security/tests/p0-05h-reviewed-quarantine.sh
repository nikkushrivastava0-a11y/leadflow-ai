#!/usr/bin/env bash
# Exact proposal rehearsal, synthetic-only; never point at hosted credentials.
set -euo pipefail
[[ "${LEADFLOW_SYNTHETIC_ONLY:-}" == YES ]] || exit 2
exists=$(psql -X -qAt -v ON_ERROR_STOP=1 -c "SELECT count(*) FROM information_schema.tables WHERE table_schema IN ('public','auth','leadflow_quarantine') AND table_name IN ('leads','clients','users','batch_meta')")
[[ "$exists" == 0 ]] || { echo 'Refusing existing database objects' >&2; exit 2; }
psql -X -q -v ON_ERROR_STOP=1 <<'SQL'
DO $roles$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname IN ('anon','authenticated') AND (rolsuper OR rolbypassrls OR rolcanlogin)) THEN
   RAISE EXCEPTION 'Synthetic API role unexpectedly privileged';
 END IF;
END $roles$;
DO $$BEGIN IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF; END$$;
CREATE SCHEMA auth;
CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,email_confirmed_at timestamptz);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
$$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;
CREATE TABLE public.clients(id bigint PRIMARY KEY,slug text UNIQUE NOT NULL,business_name text NOT NULL,owner_email text NOT NULL);
CREATE TABLE public.leads(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid,client_slug text,name text NOT NULL,email text,phone text,source text,notes text,status text,score integer,score_reason text,updated_at timestamptz,next_follow_up_at timestamptz);
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own leads" ON public.leads FOR SELECT USING(auth.uid()=user_id);
CREATE POLICY "Users can insert their own leads" ON public.leads FOR INSERT WITH CHECK(auth.uid()=user_id);
GRANT ALL ON public.clients,public.leads TO anon,authenticated;
INSERT INTO auth.users VALUES
('11111111-1111-1111-1111-111111111111','a@example.test',now()),
('22222222-2222-2222-2222-222222222222','b@example.test',now());
INSERT INTO public.clients VALUES
(1,'a','Synthetic A','a@example.test'),(2,'b','Synthetic B','b@example.test');
INSERT INTO public.leads(id,client_slug,name,notes,status,score)
SELECT md5('good-'||i)::uuid,CASE WHEN i=38 THEN 'b' ELSE 'a' END,'Synthetic valid','Preserve every column','new',i FROM generate_series(1,38)i;
INSERT INTO public.leads(id,user_id,name,notes)
SELECT md5('legacy-good-'||i)::uuid,'11111111-1111-1111-1111-111111111111','Synthetic legacy','Preserve legacy row' FROM generate_series(1,17)i;
INSERT INTO public.leads(id,user_id,name,notes)
SELECT md5('legacy-bad-'||i)::uuid,md5('missing-user-'||i)::uuid,'Synthetic unresolved','Preserve unresolved legacy' FROM generate_series(1,34)i;
INSERT INTO public.leads(id,client_slug,name,notes)
SELECT md5('orphan-slug-'||i)::uuid,'unknown-'||(i%3),'Synthetic unresolved','Preserve unknown slug' FROM generate_series(1,5)i;
SQL
query(){ psql -X -qAt -v ON_ERROR_STOP=1 -c "$1"; }
assert(){ [[ "$2" == "$3" ]] || { echo "FAIL $1 expected=$2 actual=$3" >&2; exit 1; }; echo "PASS $1"; }
if psql -X -q -v ON_ERROR_STOP=1 -f security/proposals/p0-05h-staging-quarantine.sql >/dev/null 2>&1; then echo 'FAIL unapproved quarantine ran'; exit 1; fi
assert approval_blocks 0 "$(query "SELECT count(*) FROM pg_namespace WHERE nspname='leadflow_quarantine'")"
# Missing one reviewed ID must fail before mutation.
if psql -X -q -v ON_ERROR_STOP=1 <<'SQL' >/dev/null 2>&1
CREATE TEMP TABLE leadflow_reviewed_quarantine_ids(id uuid PRIMARY KEY);
INSERT INTO leadflow_reviewed_quarantine_ids SELECT id FROM public.leads WHERE name='Synthetic unresolved' LIMIT 38;
SET leadflow.reviewed_quarantine_release='APPROVED_IN_STAGING';
SET leadflow.reviewed_quarantine_count='39';
\i security/proposals/p0-05h-staging-quarantine.sql
SQL
then echo 'FAIL partial manifest accepted'; exit 1; fi
assert manifest_failure_preserves_94 94 "$(query 'SELECT count(*) FROM public.leads')"
# Same-sized but substituted manifest must also fail (count alone is unsafe).
if psql -X -q -v ON_ERROR_STOP=1 <<'SQL' >/dev/null 2>&1
CREATE TEMP TABLE leadflow_reviewed_quarantine_ids(id uuid PRIMARY KEY);
INSERT INTO leadflow_reviewed_quarantine_ids SELECT id FROM public.leads WHERE name='Synthetic unresolved' LIMIT 38;
INSERT INTO leadflow_reviewed_quarantine_ids VALUES(md5('good-1')::uuid);
SET leadflow.reviewed_quarantine_release='APPROVED_IN_STAGING';
SET leadflow.reviewed_quarantine_count='39';
\i security/proposals/p0-05h-staging-quarantine.sql
SQL
then echo 'FAIL substituted manifest accepted'; exit 1; fi
assert substituted_manifest_preserves_94 94 "$(query 'SELECT count(*) FROM public.leads')"

psql -X -q -v ON_ERROR_STOP=1 <<'SQL'
CREATE TEMP TABLE leadflow_reviewed_quarantine_ids(id uuid PRIMARY KEY);
INSERT INTO leadflow_reviewed_quarantine_ids SELECT id FROM public.leads WHERE name='Synthetic unresolved';
SET leadflow.reviewed_quarantine_release='APPROVED_IN_STAGING';
SET leadflow.reviewed_quarantine_count='39';
\i security/proposals/p0-05h-staging-quarantine.sql
SQL
assert public_55 55 "$(query 'SELECT count(*) FROM public.leads')"
assert private_39 39 "$(query 'SELECT count(*) FROM leadflow_quarantine.leads')"
# Run the ACTUAL owner-linked RLS SQL against the remaining synthetic rows.
psql -X -q -v ON_ERROR_STOP=1 -c "SET leadflow.reviewed_rls_release='APPROVED_IN_STAGING'" -f security/proposals/p0-05-reviewed-rls.sql >/dev/null
owner_count(){ psql -X -qAt -v ON_ERROR_STOP=1 -c "SET ROLE authenticated; SET request.jwt.claim.sub='$1'; SELECT count(*) FROM public.leads"; }
assert owner_a_54 54 "$(owner_count '11111111-1111-1111-1111-111111111111')"
assert owner_b_1 1 "$(owner_count '22222222-2222-2222-2222-222222222222')"
for role in anon authenticated service_role; do
  if psql -X -qAt -v ON_ERROR_STOP=1 -c "SET ROLE $role; SELECT count(*) FROM leadflow_quarantine.leads" >/dev/null 2>&1; then echo "FAIL $role read quarantine"; exit 1; fi
  echo "PASS $role quarantine denied"
done
# Rollback must refuse to overwrite or silently accept post-cutover edits.
query "UPDATE public.leads SET notes='Newer synthetic edit' WHERE id=md5('good-1')::uuid" >/dev/null
if psql -X -q -v ON_ERROR_STOP=1 -c "SET leadflow.reviewed_quarantine_rollback='APPROVED_IN_STAGING'" -f security/proposals/p0-05h-staging-quarantine-rollback.sql >/dev/null 2>&1; then
  echo 'FAIL rollback accepted changed source data'; exit 1
fi
assert failed_restore_keeps_public_55 55 "$(query 'SELECT count(*) FROM public.leads')"
assert failed_restore_keeps_quarantine_39 39 "$(query 'SELECT count(*) FROM leadflow_quarantine.leads')"
query "UPDATE public.leads SET notes='Preserve every column' WHERE id=md5('good-1')::uuid" >/dev/null
# Exact restore is admin-only and adds a restrictive hold, never broad grants.
psql -X -q -v ON_ERROR_STOP=1 -c "SET leadflow.reviewed_quarantine_rollback='APPROVED_IN_STAGING'" -f security/proposals/p0-05h-staging-quarantine-rollback.sql >/dev/null
assert full_restore_94 94 "$(query 'SELECT count(*) FROM public.leads')"
assert retained_recovery_copy_39 39 "$(query 'SELECT count(*) FROM leadflow_quarantine.leads')"
assert rollback_owner_access_held 0 "$(owner_count '11111111-1111-1111-1111-111111111111')"
echo 'PASS exact quarantine + actual RLS + lossless rollback; NOT real Supabase JWT verification'
