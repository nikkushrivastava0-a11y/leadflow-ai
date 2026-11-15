# Release recon — 15 November 2026

## Continued recon — 16 November 2026 IST

Current account inventory and a new free staging creation attempt clarified the prior INVALID_ARGUMENT: the owner already has two active free projects (LeadFlow and DeadEnd) across organizations. No stage was created, no project paused, and no paid fallback attempted. Continue disposable local/CI verification until an isolated free slot is explicitly selected. Other inactive projects remain unclassified and untouched.

Vercel metadata-only inspection still shows DB/provider variables shared with generic previews; original #55 branch overrides do not apply to later branches. No values were decrypted or edited. `npm run check:staging` validates configuration without DB/provider requests. Preview/staging startup now refuses all configuration errors; hosted Vercel rejects the synthetic-test bypass.

The current GitHub stack extends through #73; its exact-head synthetic regression and Chromium Actions runs both pass. See BLOCKERS.md for links and remaining hosted/provider/backup gates. Observations below are historical, not a new read of production data.

## Observed environment mapping — 15 November
- Production Vercel project: leadflow-ai / prj_XJLZNa5XhPYdH1GiXBEzH9rU2CsU.
- Production alias leadflow-ai-flame.vercel.app targets main commit c39a0ef; no release of #55–#63.
- Production public Supabase URL identifies pqzawjeggyxarwdkdynz. Its URL variable also targets generic previews. Never treat those previews as isolated staging.
- No dedicated LeadFlow staging project or Supabase development branch was listed. Other paused generic projects remain unclassified and untouched.
- Supabase quoted a new project at $0/month in the existing organization. Creating leadflow-ai-staging returned INVALID_ARGUMENT without a project ID. No paid fallback was requested.
- PR55–63: open, draft, mergeable, recorded exact-head CI successful at inspection. No merge was performed.
- Backup inventory is unavailable through the connected Supabase tool; browser access redirects to sign-in. A real production backup is UNVERIFIED.

## Safe backup restore proposal — never executed here
1. Privately verify an existing backup's timestamp, type, checksum and scope. Do not infer backup existence from project health or successful synthetic pg_dump tests.
2. Obtain separate authorization before exporting/handling real production data. Keep database credentials in an approved secret store, not shell arguments/chat/history.
3. Restore only into an explicitly identified empty isolated target. For a custom-format pg_dump archive use pg_restore with an environment-configured staging connection; inspect the archive first. For Supabase CLI roles/schema/data dumps use the documented ordered role/schema/data restore procedure instead; formats are not interchangeable.
4. Restore/verify required roles, extensions, schema/grants and Auth behavior for that target; separately account for Storage objects, project Auth settings, API keys, functions and Vault secrets, which a database restore alone does not recreate completely.
5. Compare row counts, owner mappings, RLS and constraints; sign in with disposable users and prove cross-tenant denial. Do not send messages or run production cron/payment jobs on the restored target.
6. Record the successful restore evidence privately. Never overwrite production as a restore rehearsal.

Official procedures: https://supabase.com/docs/guides/platform/backups and https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore.

## Source review
Next16/React19 Server Actions; Supabase SSR/JWT; clients.owner_user_id ownership; leads CRM fields; private queue/outbox/drafts/reports/activity and test payment ledger. RLS enabled on all new tables, no always-true owner policy identified. Gemini uses allowlisted signals. Webhooks verify raw HMAC and durable events; Resend reuses stable payload/key; cron uses bearer authorization and leased jobs. Forward feature migrations are additive; inverse scripts contain destructive teardown and are only for disposable synthetic staging. Production rollback should disable features and preserve ledgers/history.

Health reports configuration readiness only, explicitly not DB/provider health. Startup refuses known production Supabase ref in preview/staging and public secret variable names. Hosted staging/Auth/provider acceptance remains blocked; local/CI synthetic checks cannot certify those external gates.
