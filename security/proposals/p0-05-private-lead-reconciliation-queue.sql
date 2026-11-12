-- PRIVILEGED ADMIN REVIEW ONLY. READ-ONLY. DO NOT expose via application API.
-- Returns lead UUIDs (internal identifiers) and non-PII ownership flags.
-- Does NOT return customer name, phone, email, notes, or client slug.
-- Use in a restricted administrator session; keep output outside public issues/logs.
-- Classification is NOT permission to auto-reassign/delete/rewrite any record.
WITH verified_clients AS (
  SELECT c.id,
         COUNT(u.id) AS confirmed_owner_matches
  FROM public.clients c
  LEFT JOIN auth.users u
    ON lower(trim(c.owner_email)) = lower(trim(u.email))
   AND u.email_confirmed_at IS NOT NULL
  GROUP BY c.id
),
flagged AS (
  SELECT l.id AS lead_id,
         (l.client_slug IS NOT NULL AND c.id IS NULL) AS orphan_business_slug,
         (l.client_slug IS NULL AND NOT EXISTS (
           SELECT 1 FROM auth.users u
           JOIN public.clients owned
             ON lower(trim(owned.owner_email)) = lower(trim(u.email))
           WHERE u.id = l.user_id AND u.email_confirmed_at IS NOT NULL
         )) AS unprovisioned_legacy_owner,
         (l.client_slug IS NOT NULL AND c.id IS NOT NULL AND l.user_id IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM auth.users u
            WHERE u.id = l.user_id
              AND u.email_confirmed_at IS NOT NULL
              AND lower(trim(u.email)) = lower(trim(c.owner_email))
          )) AS conflicting_business_owner,
         (l.client_slug IS NOT NULL AND c.id IS NOT NULL
          AND COALESCE(vc.confirmed_owner_matches, 0) <> 1
          AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = l.user_id)
         ) AS ambiguous_business_owner
  FROM public.leads l
  LEFT JOIN public.clients c ON c.slug = l.client_slug
  LEFT JOIN verified_clients vc ON vc.id = c.id
)
SELECT lead_id,
       concat_ws(',',
         CASE WHEN orphan_business_slug THEN 'unknown_business_slug' END,
         CASE WHEN unprovisioned_legacy_owner THEN 'unprovisioned_legacy_owner' END,
         CASE WHEN conflicting_business_owner THEN 'conflicting_business_owner' END,
         CASE WHEN ambiguous_business_owner THEN 'ambiguous_business_owner' END
       ) AS review_reasons
FROM flagged
WHERE orphan_business_slug OR unprovisioned_legacy_owner
   OR conflicting_business_owner OR ambiguous_business_owner
ORDER BY lead_id
LIMIT 200;
