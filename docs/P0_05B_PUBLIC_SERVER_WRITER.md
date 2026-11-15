# P0-05b — Protected public enquiry writer (draft, not enabled)

This is a **security-sensitive draft** for a staging-only rollout after the database has been secured.

## Why this change is needed

The old public form uses an ordinary Supabase SSR/anon client to insert directly into `public.leads`. The reviewed P0-05 RLS proposal in [PR #40](https://github.com/nikkushrivastava0-a11y/leadflow-ai/pull/40) deliberately revokes direct `anon` reads/writes. Without a protected server submission path, the public form cannot work after the safe migration.

## What this draft implements

- `src/lib/server/public-submission-client.ts` uses a separate Supabase `createClient` with a **server-only** `SUPABASE_SECRET_KEY` using the newer `sb_secret_` key format, **never** a browser client, cookie-backed user token or `NEXT_PUBLIC_` value.
- A malformed URL, missing key, obsolete/low-privilege key or short secret causes a fail-closed unavailable state.
- The public form validates name/email/phone/slug through its parent PR, then applies the durable shared Redis abuse guard, before creating an elevated Supabase client.
- Elevated calls are fixed to `clients.select('slug').eq('slug', slug).maybeSingle()` and `leads.insert()` with server-controlled `source`, `status`, `score`, and `client_slug`.
- All failure paths release their duplicate reservation. Successful database writes return success, even if confirming the duplicate reservation fails.
- The server secret is not returned to the browser, written to logs, or needed to compile this PR.

## IMPORTANT: approval and deployment gates

1. Review and test PRs #17 -> #23 -> #30; this PR is stacked on #30, **not directly based on main**. Do not cherry-pick randomly.
2. Keep this code in a **draft** PR. The real Supabase project currently has RLS disabled and public grants; this PR alone does **nothing** to close the public Data API exposure.
3. In an approved nonproduction Supabase project, explicitly configure the server-only `SUPABASE_SECRET_KEY`. Do not paste its value into chat, public GitHub issues, source files or CI.
4. Also configure the approved Upstash Redis guard variables listed in PR #30. Without these, the form intentionally fails closed.
5. In nonproduction, verify unknown slug rejection, invalid fields, duplicate requests, rate limit, Redis downtime, Supabase downtime and successful enquiry saving. Use **only synthetic test lead details**.
6. Apply the reviewed RLS/grants proposal only after the 1 unmatched business and ambiguous legacy leads are privately reconciled, staging tenant tests are green, and founder approves coordinated rollout.
7. Re-run Supabase Security Advisors and prove anonymous roles cannot directly insert/read/update/delete leads, while authenticated owners can manage only their own leads.
8. Verify that the server-only secret cannot appear in client JavaScript bundles, API responses, source maps or logs.

## Security caveats

- Supabase secret keys bypass RLS. The form handler is an intentionally restricted trusted server boundary and must not evolve into arbitrary table operations. Review it as highly privileged code.
- An attacker who can invoke PostgREST with the public key must not bypass the protected server action; this requires database RLS and revoked direct `anon` grants, not just a Redis check.
- No system relying on an external Redis reservation can guarantee exactly-once database writes during all crashes/network races without a database idempotency constraint.
- A Next.js successful build and mocked tests do not substitute for functional authorization testing.
- New Supabase API key guide: https://supabase.com/docs/guides/getting-started/api-keys
- Database security: https://supabase.com/docs/guides/api/securing-your-api

## Tests

```bash
node --experimental-strip-types --test tests/public-submission-secret.test.mjs
node --experimental-strip-types --test tests/public-lead-guard.test.ts
npx tsc --noEmit
npm run build
```

These commands must use synthetic values and must **not** hit a real Supabase project or Redis account.
