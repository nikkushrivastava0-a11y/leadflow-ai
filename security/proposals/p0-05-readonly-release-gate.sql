-- READ-ONLY deployment gate. Returns only aggregate counts and status; no PII.
-- This is a diagnostic, NOT approval to deploy. Do not treat current RLS=true
-- as evidence that the reviewed tenant policies were applied.
WITH
confirmed_matches AS (
  SELECT c.id AS client_id, u.id AS auth_user_id
  FROM public.clients c
  JOIN auth.users u
    ON lower(trim(c.owner_email)) = lower(trim(u.email))
   AND u.email_confirmed_at IS NOT NULL
),
client_summary AS (
  SELECT c.id,
    (SELECT count(*) FROM confirmed_matches m WHERE m.client_id = c.id) AS confirmed_matches
  FROM public.clients c
),
owner_duplicate_auth AS (
  SELECT lower(trim(u.email)) AS normalized_email
  FROM auth.users u
  WHERE u.email_confirmed_at IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.clients c
      WHERE lower(trim(c.owner_email)) = lower(trim(u.email))
    )
  GROUP BY lower(trim(u.email))
  HAVING count(*) > 1
),
owner_duplicate_clients AS (
  SELECT lower(trim(c.owner_email)) AS normalized_email
  FROM public.clients c
  GROUP BY lower(trim(c.owner_email))
  HAVING count(*) > 1
),
lead_review AS (
  SELECT l.id,
    (l.client_slug IS NOT NULL AND c.slug IS NULL) AS orphan_slug,
    (l.client_slug IS NULL AND NOT EXISTS (
      SELECT 1 FROM auth.users u
      JOIN public.clients owned
        ON lower(trim(owned.owner_email)) = lower(trim(u.email))
      WHERE u.id = l.user_id AND u.email_confirmed_at IS NOT NULL
    )) AS unprovisioned_legacy,
    (l.client_slug IS NOT NULL AND c.slug IS NOT NULL
      AND l.user_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM confirmed_matches m
        WHERE m.client_id = c.id AND m.auth_user_id = l.user_id
      )) AS mismatched_business_owner,
    (l.client_slug IS NOT NULL AND c.slug IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM confirmed_matches m WHERE m.client_id = c.id
      ) AND NOT EXISTS (
        SELECT 1 FROM auth.users u WHERE u.id = l.user_id
      )) AS ambiguous_slug_owner
  FROM public.leads l
  LEFT JOIN public.clients c ON c.slug = l.client_slug
)
,
ownership_metrics AS (
  SELECT
    (SELECT count(*) FROM client_summary WHERE confirmed_matches <> 1) AS unmatched_clients,
    (SELECT count(*) FROM owner_duplicate_auth) AS duplicate_auth_emails,
    (SELECT count(*) FROM owner_duplicate_clients) AS duplicate_client_emails,
    (SELECT count(*) FROM lead_review
      WHERE orphan_slug OR unprovisioned_legacy
         OR mismatched_business_owner OR ambiguous_slug_owner) AS flagged_leads
),
schema_metrics AS (
  SELECT
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'clients'
        AND column_name = 'owner_user_id'
    ) AS has_owner_user_id,
    (SELECT count(*) FROM pg_policies
      WHERE schemaname = 'public' AND
        ((tablename = 'clients' AND policyname = 'clients_owner_select')
         OR (tablename = 'leads' AND policyname IN
          ('leads_owner_select','leads_owner_insert','leads_owner_update','leads_owner_delete')))) AS reviewed_policy_count,
    EXISTS (
      SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname='public' AND c.relname IN ('clients','leads')
        AND (c.relrowsecurity IS FALSE)
    ) AS rls_disabled,
    has_table_privilege('anon','public.clients','SELECT') OR
    has_table_privilege('anon','public.clients','INSERT') OR
    has_table_privilege('anon','public.leads','SELECT') OR
    has_table_privilege('anon','public.leads','INSERT') AS broad_anon_grants
)
SELECT
  CASE WHEN unmatched_clients=0 AND duplicate_auth_emails=0
    AND duplicate_client_emails=0 AND flagged_leads=0
    THEN 'PASS' ELSE 'BLOCKED' END AS ownership_preflight,
  CASE WHEN has_owner_user_id AND reviewed_policy_count=5
    AND NOT rls_disabled AND NOT broad_anon_grants
    THEN 'PASS' ELSE 'BLOCKED' END AS hardened_schema,
  unmatched_clients, duplicate_auth_emails, duplicate_client_emails,
  flagged_leads, has_owner_user_id, reviewed_policy_count,
  rls_disabled, broad_anon_grants
FROM ownership_metrics CROSS JOIN schema_metrics;
