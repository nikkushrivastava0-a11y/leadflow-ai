-- Safe READ-ONLY audit: aggregate counts and security metadata only.
-- This file can be reviewed and executed without modifying customer rows.
-- Do not add SELECT * or personal record fields to public CI/logs.

SELECT
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname='public' AND c.relname IN ('clients', 'leads')
ORDER BY c.relname;

SELECT
  schemaname, tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname='public' AND tablename IN ('clients','leads')
ORDER BY tablename, policyname;

SELECT grantee, table_name, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema='public'
  AND table_name IN ('clients','leads')
  AND grantee IN ('anon','authenticated')
ORDER BY table_name,grantee,privilege_type;

SELECT
  (SELECT count(*) FROM public.clients) AS client_count,
  (SELECT count(*) FROM public.leads) AS lead_count,
  (SELECT count(*) FROM auth.users) AS auth_account_count;

SELECT
  count(*) FILTER (WHERE u.id IS NULL) AS unmatched_clients,
  count(*) FILTER (WHERE u.id IS NOT NULL) AS matched_confirmed_clients
FROM public.clients c
LEFT JOIN auth.users u
  ON lower(trim(c.owner_email))=lower(trim(u.email))
  AND u.email_confirmed_at IS NOT NULL;

SELECT
  count(*) AS total,
  count(*) FILTER (WHERE l.client_slug IS NULL) AS no_slug,
  count(*) FILTER (
    WHERE l.client_slug IS NOT NULL AND c.id IS NULL
  ) AS missing_client_reference,
  count(*) FILTER (WHERE l.user_id IS NULL) AS no_user_id,
  count(*) FILTER (
    WHERE l.user_id IS NOT NULL AND u.id IS NULL
  ) AS invalid_user_id
FROM public.leads l
LEFT JOIN public.clients c ON c.slug=l.client_slug
LEFT JOIN auth.users u ON u.id=l.user_id;

-- Additional classification for planning a non-destructive reconciliation.
SELECT count(*) AS needs_human_review
FROM public.leads l
LEFT JOIN public.clients c ON c.slug=l.client_slug
LEFT JOIN auth.users owner_u
  ON lower(trim(c.owner_email))=lower(trim(owner_u.email))
  AND owner_u.email_confirmed_at IS NOT NULL
LEFT JOIN auth.users legacy_u ON legacy_u.id=l.user_id
WHERE owner_u.id IS NULL AND legacy_u.id IS NULL;
