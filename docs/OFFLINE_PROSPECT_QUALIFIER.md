# Offline coaching-centre prospect qualifier (P1-04b)

**Status: draft prototype, not a live lead finder.** This script processes **only a local, manually supplied JSON file** of public business-level facts. It does not discover websites, scrape, call APIs, contact businesses, store leads in the CRM, or send messages. Output is a JSON review queue, not verified prospect qualification or consent to contact.

## Run

```sh
node --test tests/qualify-prospects.test.mjs
node scripts/qualify-prospects.mjs ./my-public-businesses.json
```

Input format (fictional sample; date must be refreshed after manually checking the source):

```json
[
  {
    "businessName": "Example Coaching",
    "area": "Greater Noida",
    "service": "Exam preparation",
    "officialUrl": "https://example.com",
    "sourceUrl": "https://example.com/about",
    "verifiedAt": "2026-11-09"
  }
]
```

Only the six documented fields are accepted. Do not include owner names, email addresses, phone numbers, personal social accounts, private records or credentials. A source must be HTTPS and verified within 30 days; an invalid source is discarded. Duplicate business-name/area pairs are flagged rather than removed. This is **not** a comprehensive URL/SSRF validator and no URL is fetched. The script does not establish business existence or independently verify a submitted claim.

Before outreach, a human must confirm the actual business, source and appropriate communication permissions. Outreach requires separate explicit founder approval. No invented sales, revenue or response rates.

## Acceptance / next steps

- Run synthetic tests and inspect JSON output locally.
- Manually confirm source URLs and factual claims.
- Future P1-04 product work needs a permission-aware research UI, reliable independent public-source verification, privacy review and consent-aware workflow. This subtask does not complete P1-04.
