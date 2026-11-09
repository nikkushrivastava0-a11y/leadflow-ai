# Offline coaching landing-page prototype (P1-05a)

This is a **local, unpublished HTML draft generator**, not a hosted site builder. It accepts owner-reviewed business facts only and does not discover facts, scrape sites, call AI APIs, collect leads, deploy, or publish. The generated HTML is explicitly `noindex,nofollow` and has no analytics, testimonials, fabricated outcomes or pricing.

## Local use

Create a local JSON file (do not commit customer information):

```json
{"name":"Example Academy","city":"Greater Noida","description":"Classes for maths and science.","courses":["Maths","Science"],"contactUrl":"https://example.org/enquire"}
```

Run `node scripts/coaching-site-generator.cjs input.json draft.html` then open `draft.html` locally. Existing output files are never overwritten. Run `node --test tests/coaching-site-generator.test.cjs` for synthetic tests.

Before any real publication: owner must approve all facts and brand use; verify course availability, contact URL, accessibility, privacy disclosures, domain ownership and actual mobile/browser appearance. This does not integrate with the CRM or create a functioning lead form.
