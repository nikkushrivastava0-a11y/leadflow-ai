# Customer journey release prerequisites

This candidate adds explicit stored score explanations and a next-follow-up scheduler. Follow-ups save a UTC timestamp and display it with a UTC label; the editor accepts the browser's local timezone and converts it to UTC. Scheduling does not send email/messages or run reminders.

## Required database change

`docs/journey-follow-up.sql` is a proposal, not an applied migration. The combined security release SQL may already include the same idempotent column creation and narrow grant. Verify `public.leads.next_follow_up_at` exists as nullable `timestamptz` and that the owner-linked UPDATE policies and narrow column grants permit it. Without that prerequisite, saving returns a visible unconfirmed-error state; it must not claim success. Do not deploy the application as customer ready before the real Auth/RLS tests.

Rollback the application before reverting permissions; retain the column and timestamps so schedules are not lost. Never drop customer schedules as a routine rollback.

## Actual verification remaining

- Two verified test accounts with provisioned business rows: confirm account A cannot read or update/delete account B leads or follow-ups, including legacy null-slug rows.
- Save/change/clear a follow-up, reload the deployed dashboard, confirm persistence and timezone conversion.
- Session expiry and sign-out must lead to login; sign-out failures remain visible rather than claiming logout succeeded.
- Newly verified signup still requires an approved business workspace. There is no self-service ownership claim flow. Manual provisioning must follow the verified-owner security runbook.
- AI errors fall back to a labelled rules estimate; a historical score without explanation is explicitly unverified. No production AI request was made for this review.

Automated action regressions use fake authenticated scopes and an in-memory query fixture. They verify the actual server action code's filters and confirmation behavior; they are not real Supabase JWT or deployed browser tests.
