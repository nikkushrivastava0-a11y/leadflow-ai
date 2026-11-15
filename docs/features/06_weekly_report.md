# Weekly owner reports
One deduplicated job per business for the previous closed Monday–Monday week in Asia/Kolkata. Exact SQL aggregates avoid PostgREST row caps. Reports count newly created enquiries, score 70+, won, unanswered and average score. Statuses/scores are explicitly a generation-time snapshot, not historical status-at-midnight. Metrics and mail payloads persist for stable retries; no lead contact list is emailed. Owner opt-out is checked before sending. Existing scheduler and Resend outbox do the work.

Manual setup: restore-copy rehearsal and migration 06, then LEADFLOW_WEEKLY_REPORTS_ENABLED=true with email/automation flags and scheduler working. Confirm reports with synthetic leads around Monday 00:00 IST and zero-lead weeks. Owners can opt out at /dashboard/settings. Initial enable sends only the immediately preceding week, not a full historical backfill. No extra redirects/secrets or service provisioning.

Risks: a delayed scheduler delays reports; leads can change status after week end. At 10 businesses this adds roughly 40–50 emails/month; incremental estimate ₹0 within existing email quota. Combined notification/reminder usage may require an explicitly approved paid tier; no upgrade is automatic.

Rollback: disable LEADFLOW_WEEKLY_REPORTS_ENABLED, retain snapshots/receipts. Disposable-staging rollback 06 drops report objects/jobs after exporting history; it does not edit lead records.
