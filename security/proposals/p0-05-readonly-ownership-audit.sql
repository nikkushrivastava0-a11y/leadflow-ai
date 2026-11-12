-- READ-ONLY, aggregate-only review. No customer PII, emails, names, UUIDs or slugs returned.
-- For a privileged private admin session only. Never make this a client-facing API.
-- Running this does NOT approve, reconcile, or apply the staged RLS migration.
-- Counts may overlap: categories are distinct failure modes, not a partition.
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
SELECT 'clients_total' AS metric, (SELECT count(*) FROM public.clients) AS count
UNION ALL SELECT 'leads_total', (SELECT count(*) FROM public.leads)
UNION ALL SELECT 'clients_without_unique_confirmed_owner', (SELECT count(*) FROM client_summary WHERE confirmed_matches <> 1)
UNION ALL SELECT 'duplicate_confirmed_auth_emails', (SELECT count(*) FROM owner_duplicate_auth)
UNION ALL SELECT 'duplicate_client_owner_emails', (SELECT count(*) FROM owner_duplicate_clients)
UNION ALL SELECT 'leads_with_unknown_business_slug', (SELECT count(*) FROM lead_review WHERE orphan_slug)
UNION ALL SELECT 'legacy_leads_without_provisioned_owner', (SELECT count(*) FROM lead_review WHERE unprovisioned_legacy)
UNION ALL SELECT 'business_leads_with_conflicting_owner_uuid', (SELECT count(*) FROM lead_review WHERE mismatched_business_owner)
UNION ALL SELECT 'business_leads_with_ambiguous_owner', (SELECT count(*) FROM lead_review WHERE ambiguous_slug_owner)
ORDER BY metric;
