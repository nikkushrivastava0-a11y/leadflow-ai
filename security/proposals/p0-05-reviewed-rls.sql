-- PROPOSAL ONLY — DO NOT APPLY TO PRODUCTION.
-- P0-05: RLS + minimum privileges for EXISTING LeadFlow AI tables.
--
-- HISTORY: Initial 2026-11-09 audit found RLS OFF. The founder subsequently
-- ENABLED RLS on both tables. The current situation still has broad grants,
-- insufficient owner policies and 7 clients/94 leads. One client has no
-- confirmed Auth match; 38 leads have neither a verified business owner nor
-- a valid Auth user. This migration MUST ABORT until privately reconciled.
--
-- Prerequisites BEFORE running in a disposable staging clone:
--   1) Human review and resolve unmatched owner/ambiguous legacy leads.
--   2) Migrate public form submissions to a guarded SERVER-ONLY path.
--      This script deliberately REVOKES ALL anon writes and reads.
--   3) Test with 2 synthetic Auth users and 2 businesses.
--   4) Approve downtime/deployment plan and explicit env approval.
--
-- The SQL is deliberately blocked by a session approval sentinel.
-- Setting it is an explicit human action, not part of automated deployment.
-- SET LOCAL leadflow.reviewed_rls_release = 'APPROVED_IN_STAGING';
--
-- Do not execute from CI, Supabase MCP, or a production migration runner
-- while preflight anomalies remain. No rows should be guessed/reassigned.

BEGIN;

DO $review$
BEGIN
  IF current_setting('leadflow.reviewed_rls_release', true)
     IS DISTINCT FROM 'APPROVED_IN_STAGING'
  THEN
    RAISE EXCEPTION 'LeadFlow RLS review gate: staging-only approval sentinel missing';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.clients c
    LEFT JOIN auth.users u
      ON lower(trim(c.owner_email)) = lower(trim(u.email))
     AND u.email_confirmed_at IS NOT NULL
    WHERE u.id IS NULL
  ) THEN
    RAISE EXCEPTION 'Unmatched client owner: resolve in a private admin workflow';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.leads l
    LEFT JOIN public.clients c ON c.slug=l.client_slug
    LEFT JOIN auth.users c_owner
      ON lower(trim(c.owner_email))=lower(trim(c_owner.email))
     AND c_owner.email_confirmed_at IS NOT NULL
    LEFT JOIN auth.users legacy_user ON legacy_user.id=l.user_id
    WHERE c_owner.id IS NULL AND legacy_user.id IS NULL
  ) THEN
    RAISE EXCEPTION 'Ambiguous legacy leads: reconcile ownership without guessing';
  END IF;

  -- Conflicting verified business owner and valid legacy Auth UUID is
  -- ambiguous: fail closed rather than assigning a different tenant's data.
  IF EXISTS (
    SELECT 1 FROM public.leads l
    JOIN public.clients c ON c.slug = l.client_slug
    JOIN auth.users verified_owner
      ON lower(trim(verified_owner.email)) = lower(trim(c.owner_email))
     AND verified_owner.email_confirmed_at IS NOT NULL
    WHERE l.user_id IS NOT NULL
      AND l.user_id <> verified_owner.id
      AND EXISTS (SELECT 1 FROM auth.users valid_user WHERE valid_user.id=l.user_id)
  ) THEN
    RAISE EXCEPTION 'Conflicting lead owner and business slug: private review required';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.schemaname='public'
      AND p.tablename IN ('clients','leads')
      AND p.policyname NOT IN (
        'Users can insert their own leads',
        'Users can view their own leads'
      )
  ) THEN
    RAISE EXCEPTION 'Unexpected policies found; human review before replacement';
  END IF;
END
$review$;

-- Immutable, Auth-linked owner identity. Do not use user_metadata as a trust
-- root. Email is used only for human-reviewed one-time backfill, never RLS.
ALTER TABLE public.clients
  ADD COLUMN owner_user_id uuid REFERENCES auth.users(id) ON DELETE RESTRICT;

UPDATE public.clients c
SET owner_user_id = u.id
FROM auth.users u
WHERE lower(trim(c.owner_email)) = lower(trim(u.email))
  AND u.email_confirmed_at IS NOT NULL;

ALTER TABLE public.clients
  ALTER COLUMN owner_user_id SET NOT NULL;
CREATE UNIQUE INDEX clients_owner_user_id_uniq
  ON public.clients (owner_user_id);
CREATE INDEX leads_client_slug_idx ON public.leads (client_slug);
CREATE INDEX leads_user_id_idx ON public.leads (user_id);

-- Historic policies remain active now that RLS is enabled, but do not match
-- the business ownership model. Replace only after coordinated approval.
DROP POLICY IF EXISTS "Users can insert their own leads" ON public.leads;
DROP POLICY IF EXISTS "Users can view their own leads" ON public.leads;

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Revoke old database-wide grants. RLS alone is NOT enough if API roles
-- keep TRUNCATE, TRIGGER or REFERENCES privileges.
REVOKE ALL PRIVILEGES ON TABLE public.clients FROM anon, authenticated, PUBLIC;
REVOKE ALL PRIVILEGES ON TABLE public.leads FROM anon, authenticated, PUBLIC;

-- Clients are private. No anon SELECT on clients because owner_email and
-- other profile data must not become enumerable via Data API.
-- Owner dashboard's client lookup will continue to select its own slug.
GRANT SELECT ON TABLE public.clients TO authenticated;
CREATE POLICY clients_owner_select
  ON public.clients FOR SELECT TO authenticated
  USING (owner_user_id = (SELECT auth.uid()));

-- No direct clients INSERT/UPDATE/DELETE to authenticated or anon.
-- New-client provisioning must be a separate verified, authenticated,
-- narrowly scoped server operation.

-- CRM: authenticated owners only, with column-level mutating grants.
GRANT SELECT ON TABLE public.leads TO authenticated;
GRANT INSERT (
  user_id, client_slug, name, email, phone, source, notes,
  status, score, score_reason
) ON TABLE public.leads TO authenticated;
GRANT UPDATE (status, updated_at) ON TABLE public.leads TO authenticated;
GRANT DELETE ON TABLE public.leads TO authenticated;

-- Authorize by verified business slug when present.
-- Legacy user_id fallback is allowed ONLY when client_slug is NULL.
-- Do not use NOT EXISTS on clients for a non-null orphan slug here:
-- clients RLS filters other businesses from view, so NOT EXISTS could be
-- TRUE for a different tenant and leak their row to a conflicting user_id.
CREATE POLICY leads_owner_select
  ON public.leads FOR SELECT TO authenticated
  USING (
    (
      client_slug IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.clients c
        WHERE c.slug = leads.client_slug
          AND c.owner_user_id = (SELECT auth.uid())
      )
    )
    OR
    (
      user_id = (SELECT auth.uid())
      AND client_slug IS NULL
    )
  );

-- Manual inserts require BOTH the verified owner id and matching business.
-- Direct anon inserts are NOT permitted. Public forms need a protected
-- Next.js server submission with an approved server-only credential and
-- atomic anti-spam guard; a public anon insert grant would bypass it.
CREATE POLICY leads_owner_insert
  ON public.leads FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.slug = leads.client_slug
        AND c.owner_user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY leads_owner_update
  ON public.leads FOR UPDATE TO authenticated
  USING (
    client_slug IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.slug = leads.client_slug
        AND c.owner_user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    client_slug IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.slug = leads.client_slug
        AND c.owner_user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY leads_owner_delete
  ON public.leads FOR DELETE TO authenticated
  USING (
    client_slug IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.slug = leads.client_slug
        AND c.owner_user_id = (SELECT auth.uid())
    )
  );

-- Intentionally NO anon policies and NO anon grants.
-- Intentional side effect until secure public form adapter is rolled out:
-- anonymous enquiry insert and client slug lookup will FAIL.
-- We prefer a visible outage in staging over silently exposing customer PII.

COMMIT;
