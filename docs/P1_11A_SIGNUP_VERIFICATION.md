# P1-11a — Accurate signup and sign-in state

**Status: draft UI and client-side behavior only. No Supabase Auth settings, users, records, customer data, secrets or production code were changed.**

## Existing issue

The original login page displayed **"Account created! Logging you in..."** and navigated to `/dashboard` whenever `supabase.auth.signUp()` returned no error, even when it returned `session: null` because email confirmation is required.

This gives the user false confidence that they are signed in and then leads into a broken dashboard. It can also expose whether a particular email already has an account if custom error text is shown without care.

## Implemented behavior

- If Supabase returns `data.user` but no `data.session` on signup, the page displays a generic inbox-verification message and stays on the sign-in page. It never claims a session was established.
- A signup **with** both a valid user object and session can navigate to `/dashboard`, while warning that business workspace membership is separate.
- Sign-in navigates only if **both** `user` and `session` exist and no error was returned.
- Invalid or incomplete API responses fail closed. Temporary network errors show a human-readable retry message; no user email or password is logged.
- Password state is cleared after account creation and when switching signup/signin modes. Loading buttons are disabled while a request is pending.
- Inline confirmation has an accessible `role=status`, instead of a success toast that vanishes.

## What is NOT fixed

This is **not** an automatic business profile provisioning system. Live Supabase has RLS enabled, but `clients` has no owner-select policy and existing owners may not see their own business. Fresh signup does not automatically create a `clients` row. This must be resolved separately with an Auth-linked ownership migration and a secure server-only provisioning flow in staged PRs.

Do not offer paid onboarding or promise a shareable form merely because the Auth signup succeeded.

## Verify before merge

1. In nonproduction Supabase, enable email confirmation and use a synthetic test email. Confirm signup shows a pending email state and does NOT navigate.
2. Follow the confirmation link in the same browser, then sign in and verify `/dashboard` is accessible only when the profile has an approved owner mapping.
3. Repeat with email confirmation disabled (development only) to ensure a returned session is treated differently.
4. Test wrong password, service/network errors, keyboard focus, mobile screen and screen-reader announcements.
5. Review CI run for synthetic signup response tests plus full Next typecheck/build.

Official Supabase password sign-in reference: https://supabase.com/docs/guides/auth/passwords
