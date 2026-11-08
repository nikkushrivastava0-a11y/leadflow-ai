# Agent Studio — LeadFlow AI

A public, read-only founder operations board at \`/agent-studio\`.

## What it does

- Shows six startup roles: CEO, CTO, Marketing, Sales, Product and Finance.
- Defines each role's responsibilities and intended output.
- Reads public issues from \`nikkushrivastava0-a11y/leadflow-ai\` every ~2 minutes, extracting issues titled \`[ROLE] [P0|P1|P2] Task description\`.
- Offers role, issue-status and text search filters.
- Reports GitHub issue open/closed counts and a completion percentage.
- Labels real revenue as not connected; displays customer milestones as **targets**, not actuals.
- Works without an active Supabase project and without GitHub/AI API credentials.

## What it explicitly does NOT do

- It does not start autonomous AI agents, send prospect messages, edit GitHub issues, charge payments or deploy changes.
- It does not show any customer information, private finance data, API credentials or real subscription counts.
- It does not automatically execute the work represented by an open issue.
- It is **not founder-authenticated** yet. Treat this as a public read-only preview. Do not add private data to this route or to the public GitHub issues it reads.

## How task tracking works

1. Create an issue with \`[CTO] [P0] Fix lead ownership\` (or any of the supported roles and priorities).
2. The task appears in the queue with state **Open**. Click its card to open the real GitHub issue.
3. After verifying the completion criteria, close the issue in GitHub.
4. Within roughly two minutes, the board updates its progress on the next refresh.

If GitHub is unavailable or rate-limited, the board displays an explicit warning instead of fabricating issue counts.

## Smoke-test checklist

- Open \`/agent-studio\` and verify there are six role cards with different mandates.
- Verify the initial real issues are visible and link to GitHub.
- Choose CTO, then Completed and Search; verify task filters.
- Test desktop and narrow mobile viewport; no horizontal scrolling should occur.
- Temporarily simulate GitHub API failure; the board must display an unavailable state rather than fake 0s.
- Close a known test issue, then verify GitHub-synced completion after revalidation.
- Verify \`/dashboard\` remains unchanged.
- Run \`npx tsc --noEmit\`, \`npm run lint\`, \`npm run build\`.
- Verify preview deployment before promoting anything to production.

## Next planned phase (requires separate review)

- Restore Supabase and verify owner-only RLS.
- Move confidential founder KPIs behind server-verified founder authentication.
- Feed *actual* qualified contacts, demos, and paid customers from an authorised private data store.
- For AI agents: start with read-only agents that draft a plan/PR for approval; never permit unsupervised outreach or production writes.

See the separate Hermes-compatible founder skill PR for reusable instructions; this dashboard does not depend on Hermes.
