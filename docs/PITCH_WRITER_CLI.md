# LeadFlow AI — permission-based Pitch Writer CLI

**Status:** local draft tool, NOT an autonomous outreach agent and NOT an in-app messaging feature.

This prototype helps the founder write three tailored drafts for a **real, verified public fact** about a business without paying an LLM or messaging provider. It never scrapes sites, searches private contacts, sends messages, stores prospects or makes API calls. The founder remains responsible for fact checking, permission, and manual delivery.

## Start on Windows PowerShell

From the cloned LeadFlow AI repository:

```powershell
npm run pitch -- --business "Demo Coaching Academy" --verified-fact "the academy offers JEE preparation batches" --niche coaching --channel all
```

This produces reviewed-format drafts for WhatsApp/business DM, LinkedIn and email. For one channel:

```powershell
npm run pitch -- --business "Demo Coaching Academy" --verified-fact "the academy offers JEE preparation batches" --channel email
```

Supported niches: `coaching`, `gym`, `salon`, `other`. Supported channels: `all`, `whatsapp`, `linkedin`, `email`.

The business and fact values above are **synthetic examples**, not claims about a real institute.

## Example outreach process

1. Verify an actual business and an appropriate public business partnership/contact path.
2. Read its **official** website, capture one plain public fact, record the source privately and date checked.
3. Generate drafts locally using `npm run pitch`.
4. Edit the draft for natural language and the person/channel; do not copy-paste across a bulk list.
5. Check the business consents to that channel and respect opt-outs.
6. Only send manually with explicit founder approval. This tool will never send.
7. Record qualified replies and demos in a private CRM or tracking sheet. Never invent metrics.

## How this differs from an AI agent

This is a deterministic and transparent first tool, not an LLM-generated or self-sending autonomous agent. It requires no API key or budget. If later connected to an AI-assisted copy-review workflow, keep verified facts as the source of truth, require a human review, and never grant automatic send privileges.

## Test

```powershell
npm run test:pitch
```

Tests cover normal draft generation, bad input, private contact details, strict channel selection, help text, and no-send representation. They use Node's built-in runner and no external service.

## Boundaries

- It does not guarantee customer replies, meetings or revenue.
- It is not an approved WhatsApp marketing integration; comply with platform/local restrictions.
- It does not create business data in Supabase; that production project is currently inaccessible.
- It is not exposed in the customer dashboard. An authenticated, user-friendly web UI is a later task after the founder's design preferences and 3D references are respected.
- Never put private email addresses/phone numbers into the `--verified-fact` input. The tool checks for obvious contact details but human review is still required.

**Business KPI:** number of genuine replies / manually contacted, qualified businesses. Report unknown as `N/A`, not zero.
