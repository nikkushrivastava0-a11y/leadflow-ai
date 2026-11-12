# P0-05e — Unresolved lead isolation: read-only cohort assessment

**Status: proposal only.** This branch contains no deployment, migrations, customer-record updates, automatic owner mapping, or quarantine writes.

## Why

On the live 2026-11-12 audit, 94 leads and 7 clients were observed. Of those, 5 had an unknown business slug, 34 were unprovisioned legacy records, and 55 lacked these identified ownership flags. A separate contact-deduplication check found reused emails/phones, but *matching contact data is not authorization evidence*. None of the 39 flagged rows can be given an owner based on those matches.

## Safe next step

Run `security/proposals/p0-05e-readonly-quarantine-cohorts.sql` in a privileged **read-only admin session** to identify proposed cohorts by count, never by customer contact or lead UUID.

- **QUARANTINE**: unresolved owner; do not expose through CRM, email, exports, AI scoring or public endpoints.
- **REVIEWABLE**: preliminary ownership signal only; does **not** approve production exposure. Keep original review gates and complete staging RLS tests.
- Never infer "demo", "fake", "real customer", or "advertising prospect" from a duplicated identifier.
- Preserve all leads intact. No automatic deletion or reassignment.

## Before any actual isolation/cutover

1. Obtain founder approval on a *concrete staging design* for isolation; choose an access-denied private schema/table or row-level exclusion implemented atomically, with a reversible backup/rollback path. A read-only classification query is not isolation.
2. Verify all 39 IDs in a restricted review process against original onboarding/import or owner consent evidence. Keep names, contact details and UUIDs off public GitHub and CI logs.
3. Explicitly reconcile the proposed migration's current **abort-on-unresolved-ownership** gate. Do **not** merely remove or relax that gate; design the quarantine transfer/deny rules and preflight together, with zero unintended access to unresolved rows.
4. Test actual Supabase Auth JWTs for two tenants in disposable staging: anon denied; other tenant denied; owner CRUD for approved rows; quarantined rows denied to every normal tenant; rollback and row-count equality.
5. Audit grants, RLS policies, public form server path and rate limiter, and obtain human approval for a coordinated production deployment.

## Verification invariants

- Cohort counts sum to the source lead total, with mutually exclusive categories.
- Unknown slug and legacy no-owner cases stay quarantined even if contact fields match a known business.
- No PII, lead UUIDs or actual slug values in aggregate output.
- Query is SELECT-only and cannot modify production data.
- The existing release gate and draft RLS migration remain blocked until a separately reviewed and fully tested solution is approved.

This proposal does not make LeadFlow AI production-ready and is not a substitute for verified customer ownership.
