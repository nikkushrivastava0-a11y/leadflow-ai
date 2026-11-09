# P2-05a — Safe authentication callback redirects

**Status:** draft PR only. No production auth setting, Supabase Auth URL, customer data, redirect allowlist or Vercel production setting changed.

## Existing problem

The historical `/auth/callback` handler redirects to `new URL(request.url).origin + "/dashboard"` even when no `code` exists or the PKCE exchange fails. A URL origin derived directly from the request can be unsafe under misconfigured reverse-proxy Host handling and produces a misleading authenticated destination on failure.

## Behavior of this PR

- Extract a bounded, printable `code` parameter; treat missing/invalid codes as failure.
- Call `exchangeCodeForSession(code)`; redirect to the dashboard **only when there is no error and an actual session and user are returned**.
- On failure, send the user to a clear, noindex auth error page with a link to try signing in again. Do not include raw error text or the original code in the URL.
- Always redirect to a host from **server-controlled trusted origins**. `request.url` can only select an exact member of the trusted list; `next`, `redirect_uri`, `x-forwarded-host` and arbitrary URL hosts cannot add destinations.
- In production, accepted hosts are `AUTH_CALLBACK_ORIGIN` (if valid HTTPS root URL), the existing canonical URL `https://leadflow-ai-flame.vercel.app`, and an exact Vercel deployment host provided by Vercel's own `VERCEL_URL`. In development, `http://localhost:3000` is accepted.
- Response is an HTTP 303 with no-store caching and no-referrer policy.
- No new dependencies or customer-facing product redesign.

## Setup

In reviewed server-side staging and production settings, you may set:

```dotenv
AUTH_CALLBACK_ORIGIN=https://leadflow-ai-flame.vercel.app
```

This is an **origin** (no path, slash is allowed, no query or credentials). It is *not* a secret. Do not set arbitrary business-specific domains as the OAuth destination.

A Vercel deployment preview may be used only when the Auth provider's allowed redirect URL configuration recognizes it; ensure browser receives session cookies on the **same host**. Never blindly wildcard user-controlled domains in Supabase Auth redirect allowlists.

## Tests and QA

1. Review `tests/auth-callback-origin.test.mjs`: hostile origins, query-based redirect injection, malformed code and staging/local cases are tested with no API calls.
2. CI runs `npx tsc --noEmit` and `npm run build` with fake environment settings.
3. On approved staging, complete one real PKCE callback using a synthetic test account. Confirm the cookie persists, dashboard loads only on valid exchange, and an expired/reused code redirects to the error page.
4. Confirm direct visit to `/auth/callback` without a code fails safely, and no code/token leaks into logs or referrers.
5. Verify production redirect origins and Vercel preview URLs before merging.

## Out of scope

This PR does not create customer profiles, fix missing `clients` owner RLS policy, repair historical owner data, enable OAuth providers, or make the current production app customer-ready. Google sign-in is **not** implemented here. The existing password-based login can still be blocked by the database owner-policy issue.

Official docs:
- https://supabase.com/docs/guides/auth/sessions/pkce-flow
- https://supabase.com/docs/guides/auth/server-side/creating-a-client
- https://nextjs.org/docs/app/guides/redirecting
