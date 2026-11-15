# Feature operations and release checklist

These are manual proposals for review. No production database, record, secret, DNS, scheduler, email or payment was changed during implementation. All database verification used synthetic records on loopback. PR55 remains a prerequisite and is not merged by these PRs.

## Before any hosted change

1. Review PR55's ownership/quarantine manifests and exact source-bound release proposal. Resolve the real production ownership gate privately; never infer ownership from names, friends' accounts or URL parameters.
2. Create an encrypted production backup through an approved secure channel, store it privately, restore it to an isolated disposable target, and verify schema, record counts, owner mapping and restore success. The local synthetic dump/restore is **not** evidence that production is backed up. Backup creation/restore involving production data requires explicit user approval.
3. Rehearse feature SQL in order on the approved isolated schema, test reverse-order teardown there, and inspect advisor/security results for that target. No production URL or credentials belong in test scripts.
4. Review the exact migration diffs, grants, application commit, maintenance window and restrictive recovery plan. Keep public intake, automation, mail and test checkout off until their respective acceptance checks pass.
5. Configure secrets in the hosting secret store. Use a distinct random cron bearer secret, guard hashing secret and Razorpay webhook secret. No raw keys in chat, logs, code, screenshots or client props.
6. Supabase Auth: set the approved Site URL and exact `https://<host>/auth/callback` allowed redirect, then set `AUTH_CALLBACK_ORIGIN` to that origin. `LEADFLOW_PUBLIC_ORIGIN` controls the displayed enquiry link separately. Test password and Google PKCE sign-in, refresh and logout on the actual approved deployment.

## Migration order

| Order | Migration | Prerequisite |
| --- | --- | --- |
| 01 | `lead_qualification` | PR55 reviewed `clients.owner_user_id` / owner RLS and `leads` schema |
| 02 | `enquiry_notifications` | 01 |
| 03 | `followup_engine` | 01–02 |
| 04 | `duplicate_merge` | 01; mandatory existing public spam guard |
| 05 | `billing_test_access` | Reviewed owner schema; no existing unreviewed test ledger |
| 06 | `weekly_owner_report` | 01–03 |
| 07 | `status_audit` | 01 |

Feature migrations require session setting `leadflow.feature_migrations=REVIEWED`. This is an accidental-execution guard, not authorization to touch production. Use an approved migration runner which preserves the session setting. Do not casually apply all proposal SQL or bypass PR55's separate release sentinels.

The migration-05 ledger is the PR55 reviewed test-ledger proposal brought into feature migration history, with failed-payment records. If ledger tables already exist, stop and compare their schema/migration provenance; do not drop a real ledger to make migration pass.

## Scheduler proposal: existing Supabase Cron

The worker uses `GET /api/cron/automation` with a bearer header. Run it every five minutes for timely qualification and small-business mail volume. Each invocation claims two jobs with five-minute leases. Repeated or overlapping invocations are safe under token-owned claims and provider idempotency. Six failed attempts stop automatic retries; an exhausted lease after a crashed final attempt needs operator review.

Enable `pg_cron` and `pg_net` through the isolated project's reviewed extension setup first; use Vault for secrets. Store `leadflow_automation_url` as the approved full HTTPS worker URL and `leadflow_cron_secret` as the bearer secret **privately**, not as literal SQL in git. A schedule to review after those entries exist:

```sql
-- OPERATOR PROPOSAL ONLY: not a migration and not executed by this repository.
select cron.schedule(
  'leadflow-automation',
  '*/5 * * * *',
  $job$
  select net.http_get(
    url := (select decrypted_secret from vault.decrypted_secrets
            where name = 'leadflow_automation_url'),
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' ||
        (select decrypted_secret from vault.decrypted_secrets
         where name = 'leadflow_cron_secret')
    ),
    timeout_milliseconds := 60000
  );
  $job$
);
```

Do not grant app roles access to Vault or Cron metadata. Check `cron.job_run_details` and HTTP response status; successful submission of a pg_net request is not evidence the worker returned success. Roll back scheduling with `select cron.unschedule('leadflow-automation');` after reviewing the target. Existing database/hosting limits still apply. No additional paid scheduler is created.

Vercel Hobby daily scheduling can be used instead, but reminders may be delayed by a day and queue throughput is only two jobs/day with one daily invocation. It is unsuitable for the estimated 1,000-lead workload. More frequent Vercel scheduling may require a paid plan; do not enable it without explicit approval. Choose one reviewed scheduler rather than unintentionally duplicating both.

References: [Supabase Cron](https://supabase.com/docs/guides/cron), [pg_net](https://supabase.com/docs/guides/database/extensions/pg_net), [Vault scheduling pattern](https://supabase.com/docs/guides/functions/schedule-functions), [Vercel Cron management](https://vercel.com/docs/cron-jobs/manage-cron-jobs).

## Provider acceptance

| Feature | Manual verification before enabling |
| --- | --- |
| Qualification | Choose a currently available Gemini model; force timeout/invalid JSON in isolated testing and confirm fallback plus activity; review fit/summary quality |
| Notifications | Verify sender domain SPF/DKIM in Resend; use controlled recipient addresses, test throttling/timeouts and retry the same key; confirm actual delivery, not just API acceptance |
| Follow-ups | Controlled 24h/3d/7d age fixtures; mark contacted and confirm cancellation; inspect draft voice/language and owner opt-out |
| Spam | Honeypot, shared rate caps, repeated normalized contact, concurrency, different-tenant isolation; no guard bypass |
| Test billing | Razorpay TEST keys and instruments only; configure test webhook for capture/failure/refund/dispute; verify signed retries, bad signatures, failed/closed checkout, delayed capture, expiry and refund/dispute revocation |
| Weekly reports | Monday 00:00 IST boundary and no-lead week; owner opt-out; check exact aggregates against the isolated database |
| Audit | Owner A/B isolation, no-op status update, before/after/actor and failure rollback; app roles cannot edit/delete history |
| UI | Real browser login, preferences save, activity, narrow viewport and checkout interaction; a local HTTP pass does not replace this |

Provider acceptance was not performed against real hosted credentials. No outbound message or payment has been initiated by this work.

## Observe, retry and recover

- Inspect pending/processing/dead `automation_jobs` privately. Expired leases can be reclaimed while attempts remain. Do not expose job tables or email snapshots through a client key.
- Qualification fallback events include safe failure codes, not lead text or provider error payloads. Actual database errors retry rather than reporting success.
- Email payloads are immutable per job; same key/body is used for retries. `provider_id` is provider acceptance, not proof of inbox delivery. `email.job_completed` with no provider receipt can mean skipped, expired-ambiguous or recipient-changed processing; inspect the associated job/snapshot privately.
- Resend retains idempotency keys for 24 hours. At 20 hours from first message preparation, ambiguous delivery stops. Reconcile with the provider before any manual resend; never reset a job blindly beyond that window. New owner mapping is checked before a prepared owner email is sent.
- A customer enquiry confirmation contains no booking guarantee. Reminder drafts are never automatically sent to customers.
- Keep finite test entitlements and revocation tombstones. Expiry is checked on every protected request, so no expiry cron is needed.
- Decide retention/export policy for activity and private message snapshots before high volume. Normal owner lead deletion cascades that lead's jobs/drafts and sets audit lead references null; workspace weekly reports remain separate snapshots.

## Costs

All amounts below are planning estimates for incremental usage, not provider quotations or approval to spend. Existing hosting/database plan limits apply. Provider free quotas, model availability and eligibility must be checked at setup.

| Feature | Illustrative monthly incremental budget |
| --- | --- |
| Rules qualification | ₹0 model cost |
| Optional Gemini qualification, 1,000 leads | Reserve ₹0–300 with explicit usage cap |
| Resend confirmations/alerts, up to 2,000 emails | ₹0 within eligible quotas; otherwise review paid email tier, reserve roughly ₹2,000 |
| Follow-ups, up to 3,000 owner emails and model calls | Existing email allowance plus optional capped AI reserve ₹0–500 |
| Spam/merge | ₹0 new infrastructure using existing PostgreSQL |
| Razorpay test flow | ₹0 real payment charges |
| Weekly reports, ten businesses | 40–50 extra emails within shared allowance |
| Audit and README | ₹0 new service; storage/hosting quotas apply |

These email estimates share one provider account. They are not separate subscriptions. Up to 5,050 emails/month may exceed free limits; reduce optional reminders, stay within free quotas, or obtain explicit approval for a paid tier. No paid plan, card, live mode or new service is configured by this work. [Resend pricing](https://resend.com/pricing) and [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing) are the authoritative live references.

## Rollback

Disable the relevant flags, stop scheduling if needed, and roll back the application first. Retain outbox receipts, payment replay/revocation ledgers and audit evidence. Reversing schemas in production is a separate approved operation with backup/restore evidence. `supabase/rollbacks/07…01` are explicitly destructive disposable-staging teardowns and are rehearsed in reverse order; they are not a safe production data-retention strategy.
