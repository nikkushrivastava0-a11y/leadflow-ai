# LeadFlow AI — founder's weekly revenue scorecard

**Role:** CFO agent (AI-assisted analysis, founder-approved decisions)  
**Goal:** make first revenue without confusing projections, paid trials, invoices, and actual cash.  
**Currency:** INR. **Budget ceiling:** < INR 5,000 per month (including hosting, AI, tools and transaction fees).  
**Privacy:** keep client names, phone numbers, invoice references and payment credentials in a founder-controlled **private** system, not this public GitHub repository.

## Rules that keep the numbers honest

1. **Unknown is not zero.** If a metric has not been measured, write `N/A` rather than `0`.
2. **Cash collected is not MRR.** One-time setup income never counts as recurring revenue.
3. **A demo is not a customer.** Count paying customers only when a real fee was received (or verified contract billing began) and the service is provisioned.
4. **Do not count duplicates.** One business contacted multiple times is one unique prospect; list follow-ups separately.
5. **Do not assume retention.** Renewals are measured only when actual payments or billable agreements confirm them.
6. **No invented acquisition cost.** Free founder time is still work; report cash CAC and estimated founder hours separately.
7. **Never commit a filled-in scorecard into this public repo.** This file is a blank reusable definition, not the accounting ledger.
8. **Never claim profit without deductions.** Gateway fees, taxes, hosting, sales travel, refunds, AI usage and support effort matter.

## Weekly scorecard template (fill privately)

| Period (IST) | Unique businesses contacted | Positive replies | Demos completed | Active pilots | Newly paying | Total active paying | MRR (INR) | Cash collected (INR) | Actual operating expenses (INR) |
|---|---|---|---|---|---|---|---|---|---|
| Week 1 | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A |
| Week 2 | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A |
| Week 3 | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A |
| Week 4 | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A |
| Week 5 | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A |
| Week 6 | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A |
| Week 7 | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A |
| Week 8 | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A |

This is a **template**, not actual LeadFlow AI performance.

## Funnel definitions and formulas

### Outreach
- **Unique businesses contacted**: one count per legitimate, researched business first contacted during the specified week.
- **Positive replies**: interested requests for more information or demo, not automated replies or "not interested."
- **Completed demos**: demos actually held; not scheduled demos.
- **Reply rate** = positive replies / unique businesses contacted. Report as `N/A` when denominator is zero or unknown.
- **Demo attendance rate** = demos completed / demos scheduled. Count cancellations separately.
- **Demo-to-paid conversion** = new paying businesses / completed demos across the **same cohort**, not necessarily the same calendar week. Record a longer decision window when appropriate.

### Customers and finance
- **Active paying business**: has a paid, active recurring agreement and access to the actual service; a free trial alone doesn't qualify.
- **MRR**: sum of active businesses' recurring monthly subscription charges *excluding* setup, refunds, tax collected for government, and unpaid offers.
- **Cash collected**: money actually received/settled; track one-time setup separately in the private ledger.
- **Net cash movement (pre-tax, excluding founder salary)** = cash collected - actual cash paid that week. This is not necessarily accounting profit.
- **Variable monthly cost per customer** = allocable gateway fees + AI usage + incremental service cost. Attribute conservatively.
- **Contribution** = recurring fee - per-customer variable monthly cost.
- **Cash break-even customer count** = round up(fixed monthly cost / positive contribution per customer).
- **Cash CAC** = paid marketing + direct out-of-pocket acquisition expenses / newly paying businesses. Use `N/A` if none converted.
- **Founder hours**: interviews, engineering, support, and outreach. Report separately to avoid pretending a solo founder's time is free.
- **Churn**: active paying businesses cancelled during period / active paying businesses at period start. Do not report churn before a meaningful period.

## Proposed price test — not actual billing

Subject to founder approval and working invoicing/payment verification:

- Starter hypothesis: INR 499/month for basic self-service enquiry capture.
- Growth hypothesis: INR 999/month plus optional INR 999 onboarding.
- Managed hypothesis: INR 1,999/month, with specific services and capacity limits negotiated before sale.

Keep actual quotes and invoices private. Do not publish a tier as available until feature, compliance, support and payment readiness have been validated.

## Cash budget controls

| Expense type | Planned cap (INR/month) | Actual (INR/month) | Evidence |
|---|---:|---:|---|
| Compliant commercial hosting | N/A until chosen | N/A | Invoice |
| Database / storage | N/A until verified | N/A | Billing page |
| Model/API use | N/A until enabled | N/A | Usage & invoice |
| Domain / professional email | N/A | N/A | Receipt |
| Payment fees | Based on real settled fees | N/A | Settlement report |
| Local travel / demo expenses | N/A | N/A | Receipts |
| **Total** | **<5,000 policy cap** | **N/A** | Sum of receipts |

**Red flags:** any monthly commitment without a cost forecast, unexpected paid API spikes, real customer payments before verified billing, free trials with no agreed end/decision date, and claims of "profit" that exclude recurring support.

## 15-minute Friday review: six-role handoff

1. **Sales:** log unique contacts, replies, held demos, rejected leads, pilot commitments and actual paid conversions.
2. **CMO:** report the channels with qualified replies rather than vanity impressions; identify one copy/positioning hypothesis.
3. **Product:** note three repeating customer problems with anonymised evidence.
4. **CTO:** list critical unresolved defects and pass/fail test evidence. A Vercel READY build alone isn't a secure release.
5. **CFO:** reconcile real cash collected, recurring revenue, monthly costs, payment fees and founder time.
6. **CEO:** choose **one** next experiment and kill distractions. If customers aren't paying, improve targeting/offer before adding expensive automation.

## Revenue risk register

| Risk | Indicator | Response |
|---|---|---|
| No buyer interest | Positive reply rate remains weak after meaningful personalised outreach | Revisit niche, problem statement and recipient selection |
| Product not ready | Staging login/form/lead isolation failures | Pause real-data pilots; fix and test critical paths |
| Demo interest but no conversion | Many demos with no payment commitment | Ask what's missing, test pricing/value proposition, don't fabricate urgency |
| Cost overruns | Current spend approaches INR 5,000/month | Pause nonessential tools and reforecast before purchasing |
| False marketing claims | Unverified testimonials or outcome numbers | Remove claim; publish only consented, measurable results |
| Payment disputes | No verified capture/order records | Keep checkout disabled until trusted server reconciliation |

## Baseline for the next review

The current public code review confirms a CRM/form concept but does **not** establish real paying customer counts, cash collections, or live database readiness. Every metric remains `N/A` until connected to a genuine, permitted source.

**Next founder action:** record 20 qualified coaching-centre conversations and a real expense baseline, then decide whether the INR 999 Growth offer is understandable and worthwhile.
