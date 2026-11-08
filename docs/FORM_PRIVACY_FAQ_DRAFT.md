# Public enquiry form — privacy and trust copy (DRAFT; not published)

Status: founder/legal review required. This document is proposed copy, **not** a claim that a privacy policy, consent mechanism, or retention process is implemented. Do not publish until the actual data flow, processors, RLS and retention/deletion procedure have been verified.

## Short form notice (proposed)

**Why we ask:** The coaching centre receiving this enquiry uses LeadFlow AI to review and respond to admission enquiries. Share only details needed for the centre to contact you. Avoid sensitive personal information in the message field.

**Who receives it:** The selected coaching centre and its authorised staff, subject to verified access controls. LeadFlow AI acts as the technology provider. **Do not use this sentence publicly until tenant isolation and access controls pass testing.**

**Contact choice:** “I agree that [verified coaching-centre name] may contact me about this enquiry using the details I provided.” This must be an unchecked, optional checkbox where legally required; consent must be recorded with timestamp, notice version, centre identifier and channel preferences before claiming consent has been obtained. Do not imply agreement to marketing is required to send a basic enquiry without a legal basis review.

**Privacy link:** [Verified, published privacy policy URL required before launch]. Never use a dead placeholder link in production.

## FAQ candidates (for review, not published)

**Is this a confirmed admission?** No. Sending an enquiry does not reserve a seat or guarantee admission.

**Who can see my enquiry?** Only the selected centre's authorised users *once database access controls have been independently verified*. Until then, do not publish this assurance.

**Will I receive marketing messages?** The centre must explain and honour its own contact and consent policy. LeadFlow AI must not auto-send messages from an enquiry.

**Can I correct or delete my information?** Provide a verified centre contact and a working request-handling process before promising deletion or correction timeframes. Do not invent a support address.

**Is the form secure?** HTTPS, access restrictions, abuse controls and real staging tests must be confirmed before making security promises. No “100% secure” claims.

**Does LeadFlow AI charge me to enquire?** The form should not collect payment details. Do not promise a fee policy for the coaching centre without checking it.

## Launch acceptance checklist

- [ ] Verify actual fields collected, where they are stored, processors/subprocessors, storage region and access roles; do not inspect real submissions to do this.
- [ ] Verify anonymous insert, authenticated owner reads, cross-tenant denial and auditability on synthetic staging accounts (P0-05/P0-07).
- [ ] Approve data controller/processor responsibilities, legal basis, privacy notice, contact method, retention and deletion process with appropriate reviewer.
- [ ] Verify consent capture and persistence if consent is relied upon; no prechecked box, no dark pattern.
- [ ] Confirm form errors and success state never reveal other customers' data.
- [ ] Review spam/throttle dependency: PR #30 fails closed without approved Redis.
- [ ] Add truthful notice, working privacy link and accessible FAQ to form UI in a separate reviewed PR after approvals; test mobile/keyboard.
- [ ] Ensure testimonials and outcomes are genuine, authorised and independently verifiable; none are supplied here.

## Scope of this PR

Copy and launch checklist only. No user interface, database, telemetry, credentials, customer data, outreach, or production changes. This **does not complete P2-08**; it is a narrow preparatory subtask.
