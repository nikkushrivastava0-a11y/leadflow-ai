# Hermes Agent for LeadFlow AI — founder operations, not product runtime

This document is a reviewable plan inspired by the official open-source Hermes Agent project:
- https://github.com/NousResearch/hermes-agent
- https://hermes-agent.nousresearch.com/docs/user-guide/bot-mode
- https://hermes-agent.nousresearch.com/docs/user-guide/features/skills
- https://hermes-agent.nousresearch.com/docs/user-guide/security

## Why add this?

The founder has a two-month goal of first revenue and limited cash. A lightweight agent skill is more useful now than embedding a large new agent runtime into the Next.js app. It gives engineering, marketing, sales and finance work a shared discipline while preserving human control of deployments, payment operations and outbound messages.

This PR DOES NOT install or activate Hermes, create live bots, start any scheduled task, change the app, or incur any hosted model charges. The skill only becomes usable after an authorised human installs Hermes and the skill.

## Get started on Windows
1. Download and inspect the official Hermes Desktop installer from the official website, rather than running a remote PowerShell script blindly: https://hermes-agent.nousresearch.com/
2. Open Hermes Desktop; connect a model/provider you understand. Check current provider charges and set a spending limit. Do not assume inference is free.
3. After this PR is merged into main, from a terminal use:

   hermes skills inspect nikkushrivastava0-a11y/leadflow-ai/skills/leadflow-founder-ops
   hermes skills install nikkushrivastava0-a11y/leadflow-ai/skills/leadflow-founder-ops

   (Inspect is recommended before installing. The newly added skill is community source and is security-scanned by Hermes.)
4. Confirm with:

   hermes skills list

5. Start a conversation and ask:
   'Use the leadflow-founder-ops skill. Read the latest public LeadFlow AI GitHub code if available. Give a founder standup with six roles. Do not invent customers, revenue, production test results, or contact people. Return three actions for today.'

If your Hermes version uses another install syntax, consult the official skills documentation. An unmerged branch is not a published main-branch skill.

## Optional: create the six Bot Mode specialists
In Hermes Desktop > Bots, create named Bots:
- CEO: planning, priorities, customer segment
- CTO: code audit and test gates (read-only GitHub initially)
- CMO: positioning, content drafts and experiments
- Sales Head: qualified prospect list and reviewed message drafts
- Product Manager: MVP scope, pilot feedback and onboarding
- CFO: verified costs, collections and MRR

Give each Bot its own title and instructions; select only relevant toolsets. Never give every Bot unrestricted credentials. Start with ONE founder standup using the skill before investing in parallel recurring bot routines.

## Suggested first routine (manual first)
Every weekday morning: collect non-sensitive aggregated scorecard, compare with previous day, propose three priorities, draft but DO NOT send sales messages. Only schedule after manually reviewing at least one successful report. Do not configure approval bypass, autonomous outreach or production write access.

## Expected 60-day startup scorecard
- Contacts attempted (qualified, personal, non-spam)
- Replies and reply rate
- Demos completed
- Pilots active
- New paying customers and current paying customers
- MRR actually contracted; cash actually collected separately
- Open P0 bugs and verified closed bugs
- Monthly operating cost; headroom under INR 5,000

A practical goal is three paid coaching-centre customers by week six. That is a target, not an assurance of revenue.

## Technical gates before real client data or payments
- Confirm Supabase is active and check existing schema and row-level policies with two separate business accounts.
- Repair manual/public lead ownership consistency, validation, safe error handling and follow-up workflow.
- Verify the configured AI model and record AI failures as failures instead of generating false confidence.
- Implement payment authentication, server-side signature verification, order ownership and idempotency before activating any paid subscription.
- Run npx tsc --noEmit, npm run lint, npm run build, plus repeatable user-flow and payment tests.
- Use a hosting plan permitted for commercial usage.

## Why no direct Hermes dependency in package.json?
Hermes is an independent agent runtime, not a Next.js dependency needed to accept enquiries. Keeping the founder operations process outside the live customer product avoids unnecessary latency, cost, credentials and security surface area.

## Safety
No unsupervised outreach, automatic git push to main, deploys, database modifications, financial transfers, API key sharing or personal lead-data export. All such actions need specific human approval. Use example client data only in demos.
