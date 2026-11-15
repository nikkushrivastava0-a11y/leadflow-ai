-- P0-05e: READ ONLY, AGGREGATE ONLY; privileged admin session.
-- Classify current records into proposed non-destructive quarantine vs. reviewable cohort.
-- This is NOT permission to migrate or expose the reviewable cohort. No PII or IDs returned.
-- Never use as an authenticated/anonymous Data API view.
WITH verified_owner AS (
  SELECT c.id AS client_id, u.id AS auth_user_id
  FROM public.clients c
  JOIN auth.users u
    ON lower(trim(c.owner_email)) = lower(trim(u.email))
   AND u.email_confirmed_at IS NOT NULL
), classified AS (
  SELECT l.id,
    CASE
      WHEN l.client_slug IS NOT NULL AND c.id IS NULL
        THEN 'QUARANTINE_unknown_business_slug'
      WHEN l.client_slug IS NULL AND NOT EXISTS (
        SELECT 1 FROM verified_owner v WHERE v.auth_user_id = l.user_id
      ) THEN 'QUARANTINE_unprovisioned_legacy'
      WHEN l.client_slug IS NOT NULL AND (
        NOT EXISTS (SELECT 1 FROM verified_owner v WHERE v.client_id = c.id)
        OR (l.user_id IS NOT NULL AND NOT EXISTS (
          SELECT 1 FROM verified_owner v
          WHERE v.client_id = c.id AND v.auth_user_id = l.user_id
        ))
      ) THEN 'QUARANTINE_conflicting_or_ambiguous_owner'
      WHEN l.client_slug IS NOT NULL THEN 'REVIEWABLE_valid_business_slug'
      ELSE 'REVIEWABLE_confirmed_legacy_owner'
    END AS proposed_cohort
  FROM public.leads l
  LEFT JOIN public.clients c ON c.slug = l.client_slug
)
SELECT proposed_cohort, count(*)::integer AS record_count
FROM classified
GROUP BY proposed_cohort
UNION ALL
SELECT 'TOTAL_all_records', count(*)::integer FROM classified
UNION ALL
SELECT 'TOTAL_quarantine_candidates',
       count(*) FILTER (WHERE proposed_cohort LIKE 'QUARANTINE_%')::integer
FROM classified
UNION ALL
SELECT 'TOTAL_reviewable_not_approved',
       count(*) FILTER (WHERE proposed_cohort LIKE 'REVIEWABLE_%')::integer
FROM classified
ORDER BY proposed_cohort;
