# LeadFlow AI — founder pricing, pilot and conversion policy

**State:** internal sales experiment. **Not a live checkout offer.**  
**Buyer hypothesis:** owner of a small coaching centre that receives regular admission enquiries and loses track of follow-ups.  
**Review owner:** founder / CEO + CFO / Product.  
**Hard prerequisite:** working business-level data isolation, approved data handling, verified form flow and a safe billing method. Current main does not satisfy all of these.

## The paid problem (one sentence)

> An easy place for a small coaching centre to collect admission enquiries, see who needs a call and keep a clear record of conversions.

Do **not** sell "AI agents replace your admissions team" or "guaranteed 30% more admissions." Value is reliable handling of enquiries and less missed follow-up, measured during a pilot.

## Proposed monthly plans — NOT YET AVAILABLE

| Plan | Price hypothesis | Scope only after verification | Do not promise |
|---|---:|---|---|
| Starter | ₹499 per month | 1 business, enquiry form, lead dashboard, manual statuses | AI-driven admissions, WhatsApp auto-messaging |
| Growth | ₹999 per month | Starter plus assisted setup, follow-up workflow, lead priority with truthful scoring method | Fully autonomous outreach or custom integrations |
| Managed | ₹1,999 per month | Growth plus defined human support/reporting scope, subject to capacity | Unlimited support or 24/7 SLA |

**Important:** At present, features in this table represent intended package boundaries. Availability must be checked against code and staging tests before a tier is quoted or publicly published. All prices exclude taxes if applicable; confirm tax treatment with a qualified adviser before real invoices.

### One-time setup

Initial hypothesis: ₹999 one-time for Growth; only charge when the scope and actual work are described in writing. Setup fees are **not** recurring revenue. A completely self-service Starter customer would normally not pay an onboarding fee.

### Why not offer everything free for 60 days?

That would make it hard to test willingness to pay within the user's two-month revenue target. Instead, seek short, permission-based trials that explicitly define what is being tested and when the owner will decide to continue.

## Pilot agreement checklist (review before offering to anybody)

- [ ] Exact business contact, authorised decision maker and permissions confirmed privately
- [ ] Start date and end date in writing; no surprise renewal
- [ ] One specific use case (e.g., website admission enquiries into a single list)
- [ ] Expected users, data fields, storage, access rules and deletion/export handling explained
- [ ] Staging tests pass, including cross-business RLS, form validation, lead status update and errors
- [ ] No real sensitive data transferred into unverified demo or third-party AI calls
- [ ] Source of incoming enquiries and consent basis confirmed
- [ ] Manual vs automated steps clearly identified
- [ ] Support contact and reasonable response expectations disclosed
- [ ] Price for optional continuation disclosed before trial starts
- [ ] No payment or auto-renewal taken through the currently unverified Razorpay flow

### Trial length

- **New prospects:** propose **14 days** after technical gates pass, with a scheduled review on day 10 or 11.
- **Previously promised one free month:** honour the individual commitment, clarify scope, and record the agreed ending date. Do not silently shorten it.
- A trial is not a paid customer. Add to MRR only after a legitimate paid activation/contract.

## Pilot success criteria (agree with the customer)

Choose 1–2 measurable criteria, such as:

1. A valid enquiry consistently appears under the right business owner.
2. The admissions manager can quickly identify leads without a completed follow-up.
3. The manager finds the workflow worth returning to weekly.

Record actual counts and feedback. If only a few enquiries occurred, report the sample size. Never invent improvement percentages or claim admissions were caused by the product without evidence.

## Conversation after the trial

Ask:

- "Which part saved you effort?"
- "Which leads were easier to follow up?"
- "What still forced you back to Excel/WhatsApp?"
- "Would you use this next month at ₹999, or is the value not there yet?"
- "Who would need to approve a recurring fee?"

A clear "not yet" is useful product feedback. No pressure, fabricated scarcity, or misleading testimonials.

## Payment and receipt policy

**No real payment collection until the secure payment flow is implemented and validated.** The existing application creates Razorpay orders and handles browser callbacks, but the audited main code does not prove server-side signature verification, captured amount, order ownership, idempotent webhook processing or active subscription entitlements.

Before charging:
- Use a compliant commercial hosting plan.
- Verify Razorpay merchant configuration and settlement terms.
- Implement verified webhook/capture processing and order-to-business mapping.
- Confirm invoice/tax obligations and support/cancellation terms.
- Allow an appropriately authorised manual invoicing alternative only after it is documented and the founder approves it.

Do not treat payment initiation, a screenshot or a frontend "success" toast as actual cash collected.

## Cancellation and data expectations

Provide a plain-language cancellation path, explain when access ends, and specify how the customer requests data export/deletion. Confirm privacy compliance requirements for Indian customers with a qualified adviser. Do not promise data backup or retention guarantees unless the system has tested mechanisms.

## Weekly price experiment

Record these privately (not in public repo):

| Measurement | Definition |
|---|---|
| Price quoted | Exact plan, fee, time and features shown to buyer |
| Demo completed | Real demonstration held |
| Pilot accepted | Business explicitly agreed, regardless of charge |
| Paying customer | Verified paid active service, not promise or free pilot |
| Objection | Actual words, anonymised |
| Retention | Renewal actually agreed/paid |
| Cost to serve | Real payment fees, API use, founder effort and support |

After at least 10 qualified demos, evaluate whether customers actually understand the offer and whether the tier distinction matches the features they need. Do not increase prices blindly based on hypothetical projections.

## Founder approval required before publication

This document is an internal experiment, not legally approved terms. Before the pricing page, invoice, or outreach message quotes a tier as available, confirm that its specific features work and are supportable; review taxes and compliance; ensure payment and privacy release gates are satisfied.

**Next action:** use the coaching-centre discovery playbook for direct interviews. Offer a bounded pilot only when the product is safe for real customer data.
