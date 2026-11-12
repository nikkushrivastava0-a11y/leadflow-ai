#!/usr/bin/env bash
# Synthetic PostgreSQL 17 only. Requires an EMPTY disposable database, never production.
set -euo pipefail
if [[ "${LEADFLOW_SYNTHETIC_ONLY:-}" != "YES" ]]; then
  echo "Refusing to run without LEADFLOW_SYNTHETIC_ONLY=YES" >&2; exit 2
fi
psql -X -v ON_ERROR_STOP=1 <<'SQL'
BEGIN;
CREATE SCHEMA auth;
CREATE TABLE auth.users (id uuid PRIMARY KEY, email text NOT NULL, email_confirmed_at timestamptz);
CREATE TABLE public.clients (id bigint PRIMARY KEY, slug text NOT NULL UNIQUE, owner_email text NOT NULL);
CREATE TABLE public.leads (id uuid PRIMARY KEY, client_slug text, user_id uuid, name text NOT NULL);
INSERT INTO auth.users
SELECT (md5('owner'||i::text))::uuid, 'owner-'||i::text||'@example.test', now()
FROM generate_series(1,7) i;
INSERT INTO public.clients
SELECT i, 'b'||i::text, 'owner-'||i::text||'@example.test'
FROM generate_series(1,7) i;
INSERT INTO public.leads
SELECT (md5('slug-valid-'||i::text))::uuid, 'b1', NULL, 'Synthetic valid'
FROM generate_series(1,38) i;
INSERT INTO public.leads
SELECT (md5('legacy-valid-'||i::text))::uuid, NULL, (md5('owner1'))::uuid, 'Synthetic legacy owner'
FROM generate_series(1,17) i;
INSERT INTO public.leads
SELECT (md5('legacy-orphan-'||i::text))::uuid, NULL, (md5('deleted-'||i::text))::uuid, 'Synthetic orphan owner'
FROM generate_series(1,34) i;
INSERT INTO public.leads
SELECT (md5('unknown-slug-'||i::text))::uuid, 'orphan'||(i%3)::text, NULL, 'Synthetic missing slug'
FROM generate_series(1,5) i;
COMMIT;
SQL

output="$(psql -X -qAt -v ON_ERROR_STOP=1 -f security/proposals/p0-05e-readonly-quarantine-cohorts.sql)"
check() {
 local category="$1" expected="$2" actual
 actual="$(printf '%s\n' "$output" | awk -F'|' -v k="$category" '$1==k{print $2}')"
 if [[ "$actual" != "$expected" ]]; then
   echo "FAIL $category expected=$expected actual=$actual" >&2
   exit 1
 fi
 echo "PASS $category = $actual"
}
check 'TOTAL_all_records' 94
check 'TOTAL_quarantine_candidates' 39
check 'TOTAL_reviewable_not_approved' 55
check 'QUARANTINE_unknown_business_slug' 5
check 'QUARANTINE_unprovisioned_legacy' 34
check 'REVIEWABLE_confirmed_legacy_owner' 17
check 'REVIEWABLE_valid_business_slug' 38

# Ensure proposal is read-only and classification does not alter rows.
check_rows="$(psql -X -qAt -v ON_ERROR_STOP=1 -c 'select count(*) from public.leads')"
[[ "$check_rows" == 94 ]] || { echo 'FAIL mutated row count' >&2; exit 1; }
# Insert adversarial mismatch: valid slug from b2, but owner b1 UUID.
psql -X -v ON_ERROR_STOP=1 -c "INSERT INTO public.leads VALUES ((md5('conflict'))::uuid,'b2',(md5('owner1'))::uuid,'Synthetic conflicted owner');" >/dev/null
output="$(psql -X -qAt -v ON_ERROR_STOP=1 -f security/proposals/p0-05e-readonly-quarantine-cohorts.sql)"
check 'QUARANTINE_conflicting_or_ambiguous_owner' 1
check 'TOTAL_quarantine_candidates' 40
check 'TOTAL_all_records' 95
echo 'PASS: synthetic classification contract; NOT actual quarantine or RLS'
