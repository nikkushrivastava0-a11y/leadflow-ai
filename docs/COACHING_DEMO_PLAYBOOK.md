# LeadFlow AI — coaching-centre demo and pilot playbook

**Owner:** founder / Sales Head  
**Audience:** independent coaching centre owner or admissions manager in Noida / Greater Noida  
**Purpose:** learn the real admissions-enquiry workflow, demonstrate only verified capabilities, earn a low-risk pilot commitment, then convert based on measured usefulness.  
**Status:** founder-review draft. No messages sent, calls booked, or revenue collected by this document.

## Before using real customer data

- Current `main` contains an enquiry form, dashboard, lead actions, login and a checkout route, but **working end-to-end flows have NOT been verified** against the connected Supabase project. Do not claim the database-backed demo works.
- Connected `leadflow-ai` Supabase project was last observed as **INACTIVE**. Restore/check a *staging* instance, review RLS with two test tenants, validate form errors and lead CRUD, and demonstrate with strictly synthetic data.
- Do **not** click the current Razorpay upgrade CTA for real payments; billing verification and subscription activation remain incomplete. Never imply a frontend success toast means paid service activation.
- Public lead forms need anti-spam/rate limits and appropriate customer consent/privacy language before real usage.
- A *verified screen recording* is an acceptable fallback when staging is unavailable. Label it "recorded product walkthrough" and do not represent it as a live connected customer system.
- Pilot customers should understand exactly what is manual versus automated, what is unimplemented, and how their data will be processed.

## The single offer to test (not a published promise)

> "LeadFlow helps your coaching centre put every admission enquiry in one list, see who needs a call back, and track which enquiries turn into admissions."

Proposed **Growth experiment:** INR 999/month and INR 999 setup, subject to costs/terms review. Offer a time-limited guided pilot only when the functional/security launch gates are complete. Honor any free-month commitment already made to an existing prospect. No artificial urgency or fabricated results.

## What qualifies a good prospect?

- At least one person responsible for admission enquiries
- Receives enquiries from website forms, inbound calls, ads, referrals or social channels
- Can discuss how many enquiries they get and how follow-ups are recorded
- Willing to evaluate a straightforward, mostly manual follow-up workflow
- Decision maker or clearly identified evaluator joins the demo

Avoid over-targeting established institutions with mandated enterprise CRMs; they have migration/compliance requirements beyond the current MVP.

## Discovery call: 6 questions (4 minutes)

1. Last week, roughly how many new admission enquiries came in?
2. Where do you record those enquiries today (notebook, WhatsApp, Excel, software)?
3. When someone doesn't answer the first call, what happens next?
4. How do you know who needs a call today and who has already enrolled?
5. Who updates the enquiry status? Who can see the full list?
6. If this worked reliably, what would make INR 999/month worthwhile for you?

**Do not invent their answers.** Record aggregate pain points and next action in founder-owned private notes, not public GitHub issues.

## Seven-minute demo flow (when staging is verified)

| Minute | Action | What to prove |
|---|---|---|
| 0–1 | Repeat one pain heard in discovery | Show listening, not a generic AI pitch |
| 1–2 | Open a *synthetic* coaching-centre enquiry link | The form is understandable and clearly identified |
| 2–3 | Submit a synthetic lead to staging | An enquiry lands in the correct business, with safe validation |
| 3–4 | Find that lead in the logged-in owner dashboard | Business isolation and details are trustworthy |
| 4–5 | Change a status (new -> contacted -> won) | A nontechnical owner can operate the follow-up workflow |
| 5–6 | Show lead priority honestly: AI or labelled rule-based | Avoid claiming a fallback is AI, or promising automation |
| 6–7 | Explain assisted setup, limitations, pricing and pilot decision | Clear next step without pressure |

If any step fails: acknowledge it, skip to the next verified feature, and log a product defect. Never fake a successful submission, enrolled student or payment.

### Synthetic data only (fictional, never a real person)

| Name | Email | Phone | Intent | Status |
|---|---|---|---|---|
| Demo Student A | a@example.test | 9999900000 | Interested in a class | new |
| Demo Student B | b@example.test | 9999900001 | Needs schedule information | contacted |
| Demo Student C | c@example.test | 9999900002 | Asked for callback | pending |

Use only statuses **actually supported by the current app and database**. If `pending` is not a valid database status, replace it with supported `new` before importing.

## 90-second screen recording outline

- **0–15 sec:** "A coaching centre gets enquiries from several places. The risk is forgetting who to call back."
- **15–35 sec:** Show the business-specific form and one **synthetic** enquiry. State whether this is staging or a recorded simulation.
- **35–60 sec:** Show the dashboard list and status workflow. Explicitly say which parts are operational versus proposed.
- **60–75 sec:** Explain how the owner checks priority and follows up; never claim a call or WhatsApp message was automatically sent.
- **75–90 sec:** "We're exploring a small number of assisted pilots. Interested in a brief walkthrough?" Show a founder-owned contact method only after approval.

No stock AI avatars, fabricated client testimonials, fake revenue graphs or "guaranteed more admissions" claims. Use genuine product footage.

## Objections: useful and truthful responses

**"We already use Excel."**  
"That might be enough. I only want to understand whether a central enquiry form and simpler follow-up statuses would save your team effort. Could we test it for a short period?"

**"We already use WhatsApp."**  
"Keep WhatsApp. The goal is to track *which person needs a follow-up*, not replace all your conversations. Automatic WhatsApp messaging is not part of the verified current MVP."

**"Will it get more admissions?"**  
"There's no guarantee of more admissions. We can compare how reliably enquiries are captured and followed up during a pilot, and see whether that creates value."

**"Is our data secure?"**  
"We will only onboard real data after verifying access boundaries and database protections. I can show the security checklist and the exact data fields before any pilot."

**"Why pay INR 999?"**  
"The experiment is whether timely follow-up and easier tracking justify that cost for *your* team. If it doesn't save effort or improve visibility, I don't want to oversell it."

## Close each demo with one specific outcome

Choose and record exactly one: (a) a dated follow-up, (b) a staging-only pilot discussion once security is cleared, (c) explicit not interested, or (d) further technical/data questions. Do not mark a prospect as paying until actual payment and service activation are verified.

**Permission-based follow-up draft — do not auto-send:**

> Hi [Name], thanks for the conversation about how [Institute] manages admission enquiries. The main issue you mentioned was [their exact pain]. I will share a short walkthrough of the verified enquiry-to-follow-up workflow. Shall we review it on [agreed day]? — LeadFlow AI

## Pilot scorecard — measured, not guessed

Track only with owner consent, and keep client-level data in an approved private store.

| Metric | Definition | Before | During pilot |
|---|---|---|---|
| New enquiries | Count of distinct incoming admissions enquiries | Unknown until observed | Actual count |
| Enquiries contacted | Number receiving first human response | Unknown | Actual count |
| Follow-ups on time | Follow-ups completed by the agreed due date | Unknown | Actual count |
| Admissions won | Distinct enrolments actually confirmed | Unknown | Actual count |
| Admin time | Self-reported minutes/day spent organising leads | Unknown | Actual estimate |

Do not invent a percentage uplift from small samples. For a CRM that costs INR 999/month, honest reporting and reliability are stronger initial selling points than AI buzzwords.

## Trial-to-paid decision

1. Review pilot performance and defects with the owner.
2. Ask whether the workflow would be used every week.
3. If yes, explain current features and confirm ongoing support terms.
4. Use a **verified** billing/invoice process; record recurring fee and one-off setup separately.
5. Ask for a referral only after positive voluntary feedback. Never post customer names or screenshots publicly without permission.

## Internal handoff (Sales -> Product -> CTO -> CFO)

- **Sales:** prospect type, discovery pains, demo date and exact follow-up (private).
- **Product:** recurring feature friction only, no personal identifiers in GitHub issues.
- **CTO:** reproducible bugs with synthetic data, RLS/privacy implications and test evidence.
- **CFO:** actual cost, quoted price, received payment, active plan and churn risk.
- **CEO:** decide whether coaching centres remain the highest-converting niche after sufficient discovery.

### Release check before the first genuine demo
- [ ] Staging Supabase active, RLS verified with two businesses
- [ ] Form accepts a valid synthetic lead and rejects invalid/unknown ones
- [ ] Owner can see/edit only their own leads
- [ ] Error states and mobile usability confirmed in a browser
- [ ] Billing disabled until verified; no real payment collected
- [ ] Price and trial terms approved by founder
- [ ] A 90-second recording using synthetic data has been reviewed
