#!/usr/bin/env bash
set -euo pipefail

MIGRATION=security/proposals/p0-05-reviewed-rls.sql
A=11111111-1111-1111-1111-111111111111
B=22222222-2222-2222-2222-222222222222

assert_result() {
  local expected="$1"
  local actual="$2"
  local label="$3"
  if [[ "$expected" != "$actual" ]]; then
    echo "FAIL $label expected=$expected actual=$actual" >&2
    exit 1
  fi
  echo "PASS $label"
}

query_as() {
  local actor="$1"
  local statement="$2"
  psql -X -qAt -v ON_ERROR_STOP=1 <<SQL
SET ROLE authenticated;
SET request.jwt.claim.sub = '$actor';
$statement
SQL
}

should_fail_as() {
  local actor="$1"
  local statement="$2"
  if psql -X -qAt -v ON_ERROR_STOP=1 <<SQL >/dev/null 2>&1
SET ROLE authenticated;
SET request.jwt.claim.sub = '$actor';
$statement
SQL
  then
    echo "FAIL: unauthorized query succeeded: $statement" >&2
    exit 1
  fi
  echo "PASS: unauthorized request denied"
}

echo "1. Create ONLY a throwaway PostgreSQL mock of relevant Supabase schema"
psql -X -v ON_ERROR_STOP=1 <<'SQL'
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE SCHEMA auth;
CREATE TABLE auth.users (
  id uuid PRIMARY KEY,
  email text NOT NULL,
  email_confirmed_at timestamptz
);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
$$ SELECT nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;

GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;

CREATE TABLE public.clients (
  id bigint PRIMARY KEY,
  slug text UNIQUE NOT NULL,
  business_name text NOT NULL,
  owner_email text NOT NULL
);
CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NULL,
  client_slug text NULL,
  name text NOT NULL,
  email text,
  phone text,
  source text DEFAULT 'manual',
  notes text,
  status text DEFAULT 'new',
  score integer DEFAULT 0,
  score_reason text,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert their own leads" ON public.leads
  FOR INSERT WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can view their own leads" ON public.leads
  FOR SELECT USING ((auth.uid() = user_id));
GRANT ALL ON TABLE public.clients,public.leads TO anon,authenticated;

INSERT INTO auth.users(id,email,email_confirmed_at)
VALUES ('11111111-1111-1111-1111-111111111111','owner-a@example.test',now()),
       ('22222222-2222-2222-2222-222222222222','owner-b@example.test',now());
INSERT INTO public.clients(id,slug,business_name,owner_email)
VALUES (1,'business-a','Synthetic A','owner-a@example.test'),
       (2,'business-b','Synthetic B','owner-b@example.test');
INSERT INTO public.leads(id,user_id,client_slug,name) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1','11111111-1111-1111-1111-111111111111','business-a','A owned'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1','22222222-2222-2222-2222-222222222222','business-b','B owned'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',NULL,'business-a','A public synthetic'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3','11111111-1111-1111-1111-111111111111',NULL,'A legacy'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2','22222222-2222-2222-2222-222222222222',NULL,'B legacy');
SQL

echo "2. No approval sentinel must prevent any schema changes"
if psql -X -v ON_ERROR_STOP=1 -f "$MIGRATION" >/dev/null 2>&1; then
  echo "FAIL: RLS migration ran without review" >&2
  exit 1
fi
missing=$(psql -X -qAt -v ON_ERROR_STOP=1 -c "select count(*) from information_schema.columns where table_schema='public' and table_name='clients' and column_name='owner_user_id';")
assert_result 0 "$missing" "no unexpected schema changes"

echo "3. An unmatched synthetic owner must abort staged migration"
psql -X -v ON_ERROR_STOP=1 -c "insert into public.clients values (3,'unmatched','Synthetic C','unmatched@example.test');" >/dev/null
if psql -X -v ON_ERROR_STOP=1 -c "SET leadflow.reviewed_rls_release = 'APPROVED_IN_STAGING';" -f "$MIGRATION" >/dev/null 2>&1; then
  echo "FAIL: unmatched business accepted" >&2
  exit 1
fi
psql -X -v ON_ERROR_STOP=1 -c "delete from public.clients where id=3;" >/dev/null

echo "3b. Duplicate verified Auth emails must abort before UUID backfill"
psql -X -v ON_ERROR_STOP=1 -c "insert into auth.users(id,email,email_confirmed_at) values ('33333333-3333-3333-3333-333333333333','OWNER-A@example.test',now());" >/dev/null
if psql -X -v ON_ERROR_STOP=1 -c "SET leadflow.reviewed_rls_release = 'APPROVED_IN_STAGING';" -f "$MIGRATION" >/dev/null 2>&1; then
  echo "FAIL: duplicate verified Auth identity accepted" >&2
  exit 1
fi
psql -X -v ON_ERROR_STOP=1 -c "delete from auth.users where id='33333333-3333-3333-3333-333333333333';" >/dev/null

echo "3c. Duplicate client owner emails must abort before owner mapping"
psql -X -v ON_ERROR_STOP=1 -c "insert into public.clients values (3,'duplicate-owner','Synthetic duplicate','OWNER-A@example.test');" >/dev/null
if psql -X -v ON_ERROR_STOP=1 -c "SET leadflow.reviewed_rls_release = 'APPROVED_IN_STAGING';" -f "$MIGRATION" >/dev/null 2>&1; then
  echo "FAIL: duplicate business owner identity accepted" >&2
  exit 1
fi
psql -X -v ON_ERROR_STOP=1 -c "delete from public.clients where id=3;" >/dev/null

echo "4. An unowned synthetic legacy lead must abort staged migration"
psql -X -v ON_ERROR_STOP=1 -c "insert into public.leads (id,name) values ('cccccccc-cccc-cccc-cccc-ccccccccccc1','Unowned synthetic');" >/dev/null
if psql -X -v ON_ERROR_STOP=1 -c "SET leadflow.reviewed_rls_release = 'APPROVED_IN_STAGING';" -f "$MIGRATION" >/dev/null 2>&1; then
  echo "FAIL: ambiguous lead ownership accepted" >&2
  exit 1
fi
psql -X -v ON_ERROR_STOP=1 -c "delete from public.leads where id='cccccccc-cccc-cccc-cccc-ccccccccccc1';" >/dev/null

echo "5. Conflicting valid owner/tenant IDs must abort before migration"
psql -X -v ON_ERROR_STOP=1 -c "insert into public.leads (id,user_id,client_slug,name) values ('dddddddd-dddd-dddd-dddd-ddddddddddd2','$A','business-b','Conflicting owner before migration');" >/dev/null
if psql -X -v ON_ERROR_STOP=1 -c "SET leadflow.reviewed_rls_release = 'APPROVED_IN_STAGING';" -f "$MIGRATION" >/dev/null 2>&1; then
  echo "FAIL: conflicting tenant and Auth owner accepted" >&2
  exit 1
fi
psql -X -v ON_ERROR_STOP=1 -c "delete from public.leads where id='dddddddd-dddd-dddd-dddd-ddddddddddd2';" >/dev/null

echo "6. Approved proposal may run against ONLY synthetic complete-owner data"
psql -X -v ON_ERROR_STOP=1 -c "SET leadflow.reviewed_rls_release = 'APPROVED_IN_STAGING';" -f "$MIGRATION" >/dev/null

echo "6. Anonymous cannot read private business/lead data"
if psql -X -qAt -v ON_ERROR_STOP=1 -c "SET ROLE anon; select count(*) from public.clients;" >/dev/null 2>&1; then
  echo "FAIL: anon business SELECT permitted" >&2
  exit 1
fi
if psql -X -qAt -v ON_ERROR_STOP=1 -c "SET ROLE anon; select count(*) from public.leads;" >/dev/null 2>&1; then
  echo "FAIL: anon lead SELECT permitted" >&2
  exit 1
fi
if psql -X -qAt -v ON_ERROR_STOP=1 -c "SET ROLE anon; truncate public.leads;" >/dev/null 2>&1; then
  echo "FAIL: anon TRUNCATE permitted" >&2
  exit 1
fi

echo "7. Owner A and B may view ONLY their own business and lead rows"
assert_result 1 "$(query_as "$A" "SELECT count(*) FROM public.clients;")" "owner A client profile"
assert_result 1 "$(query_as "$B" "SELECT count(*) FROM public.clients;")" "owner B client profile"
assert_result 3 "$(query_as "$A" "SELECT count(*) FROM public.leads;")" "owner A leads including legacy/public"
assert_result 2 "$(query_as "$B" "SELECT count(*) FROM public.leads;")" "owner B leads including legacy"
assert_result 0 "$(query_as "$A" "SELECT count(*) FROM public.leads WHERE client_slug='business-b';")" "A cannot view B"
assert_result 0 "$(query_as "$B" "SELECT count(*) FROM public.leads WHERE client_slug='business-a';")" "B cannot view A"

echo "8. Conflicting owner UUID must NEVER reveal another business slug"
psql -X -v ON_ERROR_STOP=1 -c "INSERT INTO public.leads (id,user_id,client_slug,name) VALUES ('dddddddd-dddd-dddd-dddd-ddddddddddd1','$A','business-b','Conflicted synthetic lead');" >/dev/null
assert_result 0 "$(query_as "$A" "SELECT count(*) FROM public.leads WHERE id='dddddddd-dddd-dddd-dddd-ddddddddddd1';")" "A cannot see B slug even if row user_id names A"
assert_result 1 "$(query_as "$B" "SELECT count(*) FROM public.leads WHERE id='dddddddd-dddd-dddd-dddd-ddddddddddd1';")" "B slug owner can see this row"

echo "9. Row status actions work for own lead, not the other owner"
assert_result 1 "$(query_as "$A" "WITH changed AS (UPDATE public.leads SET status='contacted' WHERE id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1' RETURNING id) SELECT count(*) FROM changed;")" "A update own status"
assert_result 0 "$(query_as "$A" "WITH changed AS (UPDATE public.leads SET status='contacted' WHERE id='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1' RETURNING id) SELECT count(*) FROM changed;")" "A cannot update B"
assert_result 0 "$(query_as "$B" "WITH changed AS (DELETE FROM public.leads WHERE id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1' RETURNING id) SELECT count(*) FROM changed;")" "B cannot delete A"

echo "8b. Public-form rows with NULL user_id remain tenant-owned for updates and deletes"
assert_result 1 "$(query_as "$A" "WITH changed AS (UPDATE public.leads SET status='qualified' WHERE id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2' RETURNING id) SELECT count(*) FROM changed;")" "A can update own public lead"
assert_result 0 "$(query_as "$B" "WITH changed AS (UPDATE public.leads SET status='won' WHERE id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2' RETURNING id) SELECT count(*) FROM changed;")" "B cannot update A public lead"
assert_result 0 "$(query_as "$B" "WITH changed AS (DELETE FROM public.leads WHERE id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2' RETURNING id) SELECT count(*) FROM changed;")" "B cannot delete A public lead"
assert_result 1 "$(query_as "$A" "WITH changed AS (DELETE FROM public.leads WHERE id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2' RETURNING id) SELECT count(*) FROM changed;")" "A can delete own public lead"

echo "9. Owner A may create only own lead; prevent ownership reassignment"
assert_result 1 "$(query_as "$A" "WITH added AS (INSERT INTO public.leads(user_id,client_slug,name) VALUES ('$A','business-a','A manual') RETURNING id) SELECT count(*) FROM added;")" "A inserts own"
should_fail_as "$A" "INSERT INTO public.leads(user_id,client_slug,name) VALUES ('$A','business-b','Cross-business attack');"
should_fail_as "$A" "UPDATE public.leads SET client_slug='business-b' WHERE id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1';"
should_fail_as "$A" "DELETE FROM public.clients WHERE slug='business-a';"

echo "PASS: review gating, synthetic two-tenant isolation and privilege restrictions"
