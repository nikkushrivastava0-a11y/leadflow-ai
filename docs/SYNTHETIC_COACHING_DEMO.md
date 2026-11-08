# Synthetic coaching-centre CRM demo dataset

**DEMO ONLY — fictional records.** Every person, centre, phone and email below is invented. These are not customer leads, conversions, testimonials or evidence of revenue. Do not upload these rows to a production tenant or contact the listed addresses/numbers.

## Safe preparation

Use an isolated staging tenant after the Supabase schema and RLS have been reviewed. Do not use a real centre's slug. If staging is unavailable, use this document as a static walkthrough only; do not represent screenshots as working production functionality. Current main supports a public enquiry form and manual lead creation, but not automatic reminders, WhatsApp sending, admission conversion tracking or payment activation.

## Fictional scenario

**Centre:** Northstar Learning Lab (fictional), Greater Noida. **Demo business slug:** `northstar-demo` (only after creating a staging client record with this slug). **Context:** A small coaching centre wants to stop losing course enquiries across walk-ins, referrals and website submissions.

| Fictional lead | Email (reserved example domain) | Phone | Source | Notes | Suggested demonstration stage |
| --- | --- | --- | --- | --- | --- |
| Aditi Demo | aditi.demo@example.com | 0000000000 | Website Form | Asked about Class 11 mathematics batches and evening timings. | new |
| Rohan Sample | rohan.sample@example.com | 0000000000 | referral | Wants a weekend JEE foundation counselling call; parent availability unknown. | contacted |
| Meera Example | meera.example@example.com | 0000000000 | walk-in | Interested in Class 10 science; asked for fee details. | qualified |
| Kabir Test | kabir.test@example.com | 0000000000 | manual | Requested a brochure but has not confirmed interest. | new |
| Sana Fiction | sana.fiction@example.com | 0000000000 | website | Comparing two courses; needs timetable clarification. | contacted |

**Important:** `0000000000` is a deliberately non-dialable placeholder, not a valid production phone number. If form validation rejects it, enter a clearly fictional staging-only value approved for your test environment; never use an actual person's number. `example.com` is reserved for examples. The stage names are illustrative and must be matched to the app's actual status options before testing. AI lead scores are **not specified**: they must come from the running app or be labelled unavailable.

## Five-minute walkthrough (only demonstrate verified functionality)

1. Show the fictional centre and explain that each business needs its own verified client profile and tenant isolation. Do not claim onboarding is automated.
2. Open `/form/northstar-demo` in staging, enter Aditi's synthetic details, and check the submission result. This is **blocked until public-form RLS and slug lookup are verified**.
3. Open the authenticated dashboard for the same staging owner; check whether Aditi appears once. If it does not, log the failure rather than editing the screenshot.
4. Add Kabir as a manual lead, then verify it appears in the same tenant. Status editing requires review of draft PR #19 and its ownership dependency.
5. Explain that scoring may be AI-assisted or a clearly labelled rule-based fallback depending on configuration; do not present a fabricated score as AI output.
6. Sign in as a second synthetic tenant and verify it cannot read or modify the first tenant's leads before presenting this as secure multi-tenancy.

## Acceptance evidence checklist

- Record the exact staging URL, commit/PR, date and browser viewport.
- Capture form success **and** a deliberately invalid input failure.
- Verify a single lead appears in the correct owner's dashboard after form submit.
- Check stage edit and rollback only if the corresponding draft PR is deployed in staging.
- Test unauthorized cross-tenant read/update using test accounts and documented RLS policies.
- Record what failed, what was skipped, and which PR is required. A Vercel READY build alone is not functional QA.

## Demo claims to avoid

Never claim verified admissions, ROI, paid subscriptions, automatic follow-ups, live WhatsApp outreach, customer adoption, or a working production database based on this dataset. No real messages should be sent as part of the demo.

## Suggested closing line

“Here is a **fictional** example of how a coaching centre could organize incoming enquiries. Before a real pilot, we still need to verify database permissions, public form submission, and the owner dashboard together.”
