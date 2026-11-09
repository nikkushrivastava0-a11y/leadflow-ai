# P0-05d — Two-tenant RLS regression harness (simulated only)

**Purpose:** Exercise the actual staged RLS SQL proposed in PR #40 against a disposable PostgreSQL 17 database using two fake businesses and two fake Auth users. This is a test harness, **not** a Supabase production integration or a schema migration deployment.

## What the test verifies

The CI script `security/tests/p0-05d-two-tenant-migration.sh` creates only synthetic rows and a simplified `auth.uid()` implementation backed by a session setting. It loads `security/proposals/p0-05-reviewed-rls.sql` from the parent PR and checks:

- Migration cannot run without an explicit staging-review sentinel.
- An unmatched business owner aborts migration, leaving ownership unresolved.
- A lead with neither verified business ownership nor an Auth owner aborts migration.
- After synthetic complete ownership, the original proposal migrates clients to immutable `owner_user_id` and enables guarded RLS.
- Anonymous role cannot SELECT clients/leads or TRUNCATE them.
- Owner A and owner B can each see their own business only, including their owner-linked leads.
- Synthetic public-form lead with a valid `client_slug` and NULL `user_id` is owner-visible through tenant RLS.
- Legacy owner-linked lead with no slug remains SELECT-visible (but owner editing/deleting such a legacy lead is intentionally still not permitted under the current proposal).
- Owner A cannot read/update B's lead, and owner B cannot delete A's lead.
- A can update the status of an own lead and insert a correctly linked manual lead.
- A cannot insert a new lead under B's slug, change a lead's `client_slug`, or delete a business profile.

Tests run in GitHub Actions with a throwaway PostgreSQL service. The CI has **no Supabase connection or real project secrets**, and seeds only example.test identities.

## Boundaries and remaining blockers

- This is PostgreSQL policy-behaviour validation, not proof of end-to-end Supabase Auth, browser login, API gateway/RLS, commercial hosting, storage, or public form behavior.
- The real production database still has one unmatched business and ambiguous legacy leads; original migration intentionally fails until a human reconciles these privately. **Never auto-reassign or delete those rows.**
- Current RLS on both live tables is ON, but `clients` has no policies, `leads` has only two restrictive old policies, and non-row privileges are still too broad. Proposed fixes are in draft PRs #40, #41, and #42.
- PR #42 addresses only `TRUNCATE/TRIGGER/REFERENCES` privilege reduction. Do not confuse that separate hardening with full owner authorization.
- This test PR is stacked on #40 and does not write to `main` or a real database. CI assertions do not constitute deployment approval.
- Migrating live owner mappings, enabling server-only public submission and shared rate limiting require a coordinated staged release and approved configuration. A wrong policy could hide leads or interrupt customer enquiries.
- Changes to production data, customer records, secrets or paid services require explicit founder approval.

## Review order

Review PR #40's SQL and this harness together. Confirm the actual production schema matches the mock. Reconcile legacy owners in a private, approved flow. Run the same scenarios on a nonproduction Supabase project with actual JWTs, then re-run the Supabase Security Advisor before proposing a production cutover.

## Verify

View the GitHub Actions synthetic RLS job, check exact assertions, and confirm typecheck and Next.js build both complete. No `service_role` or `sb_secret_` credential belongs in CI.

Official references:
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/api/securing-your-api
