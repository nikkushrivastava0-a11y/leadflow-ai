# LeadFlow AI — first paying coaching-centre customers

**Status:** Approved draft material only; **no messages have been sent**.
**Founder goal:** first three paid pilot conversions, not a promised result.
**Market hypothesis:** independent coaching centres in Noida / Greater Noida that collect admission enquiries from websites, calls or social profiles and follow up manually.

## Who to contact
Prioritise centre owners and admissions managers, not random students:
- Independently owned centres with a real website and a public admissions/contact page.
- Centres running batches or admissions campaigns that already generate enquiries.
- Teams with at least one person responsible for following up.
- Exclude irrelevant businesses, duplicate branches, scraped private phone numbers, students, and businesses that opted out.

Keep prospect data minimal. Store the business name, public official website, contact channel, short reason it is a fit, date contacted, permission/response and the next follow-up. Avoid sensitive personal data.

## Discovery questions (learn before pitching)
1. New enquiries currently arrive where: form, calls, WhatsApp, referrals?
2. How do you know which enquiry still needs a call?
3. Roughly how many new enquiries come weekly? A range is enough.
4. Who makes the follow-up and how do they hand it off?
5. What was the last time a lead fell through the cracks?
6. If follow-up tracking was clearer, how would you judge whether it's worth paying for?

## Personalised first-contact templates

### LinkedIn connection request
Hi [Name], I’m building a simple enquiry follow-up tool for small coaching centres. I saw [specific public detail about their centre] and wanted to understand how your team tracks admission enquiries. Would you be open to a short conversation?

### First email (professional address; personalised; no bulk blast)
**Subject:** Quick question about enquiries at [Institute]

Hi [Name],

I noticed [specific relevant detail from their site].

I’m working on LeadFlow AI to help smaller coaching teams collect enquiries in one place and see which ones still need a follow-up.

I’m speaking with a few local owners before finalising the product. Could I ask how your team currently tracks these requests? If useful, I can show a short demo using sample data.

No pressure if it's not relevant.

Thanks,
LeadFlow AI

### WhatsApp (only after opt-in / warm introduction)
Hi [Name], [referrer] mentioned your admissions team might be interested in a simple enquiry tracker. I'm working on LeadFlow AI. Okay if I send a 90-second sample demo?

### Follow-up after positive reply
Thanks for getting back. To make the demo relevant, what tends to get missed today: new enquiries, who should call next, or whether someone has already followed up? I'll use sample data and focus on that one flow.

## The 7-minute demo
- 0:00–1:00 Ask their current process; don't present slides yet.
- 1:00–2:00 Open a sample coaching-centre enquiry link.
- 2:00–3:00 Submit a synthetic enquiry clearly marked as a demo.
- 3:00–4:30 Show the lead in the owner's CRM (after staging/RLS tests pass).
- 4:30–5:30 Mark it contacted/qualified, and show follow-up tracking only once implemented.
- 5:30–6:30 Explain the actual service limitations and proposed monthly price.
- 6:30–7:00 Ask whether a limited pilot would be worth trying.

**Never demonstrate fake live customers, fabricated AI scoring, or payment activation as real.**

## Pricing hypothesis (validate, don't present as established)
- Starter: INR 499/month for verified basic enquiry capture and CRM.
- Growth: INR 999/month + proposed one-time setup charge, after follow-up feature works.
- More expensive managed option only after customers request real support.
- Pilot: 14 days for new qualified prospects; honour any longer free promise already made personally.

No customer billing until the server-side payment verification and commercial hosting gate is approved. Use a legally compliant, documented invoicing flow if approved.

## CRM pipeline and weekly scoreboard

| Metric | Definition | Source |
|---|---|---|
| Qualified businesses researched | Fit assessed from official public information | Founder review |
| Businesses contacted | Individual compliant messages actually sent, not drafts | Outreach tracker |
| Replies | Actual replies within the period | LinkedIn/email/WhatsApp |
| Demos booked | Confirmed appointment | Calendar |
| Demos held | Completed demonstration | Founder notes |
| Trials active | Businesses explicitly onboarded on verified product | CRM |
| Paying businesses | Confirmed paid and active subscription/invoice | Verified billing |
| MRR | Monthly recurring revenue from active paying businesses only | Billing |
| Costs | Actual bills, not assumed figures | Invoices |

Use `unknown` when the number is not confirmed, never zero just because it has not been tracked.

## Follow-up discipline
- Only follow up when permitted and relevant.
- Make one useful follow-up after a few business days; stop if they decline or do not want further contact.
- Record whether the conversation moved toward demo, no fit or future follow-up.
- No scraping behind logins, message blasting or automatic WhatsApp sends.

## First practical outreach sprint
- Research 20 qualified businesses; do not contact every business found.
- Draft 10 messages, each with a genuinely specific sentence about the business.
- Founder reviews and decides which, if any, to send.
- Run two discovery calls before changing pricing/features.
- After every 5 conversations, update objections and the one-value-proposition statement.

## What must be verified before inviting real-data pilots
- Supabase active, actual RLS and tenant isolation tested with 2 owners.
- Public form rejects invalid/unknown submissions and handles errors.
- Manual/public leads visible to correct owner only.
- CRM status changes confirmed against test DB.
- Payment verification completed or approved alternative billing, with clear terms.
