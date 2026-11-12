# P0-05f: Synthetic quarantine isolation and rollback

This is a **disposable PostgreSQL regression harness**, not an approved Supabase staging migration.

The script refuses to run unless `LEADFLOW_SYNTHETIC_ONLY=YES` is set and targeted tables are absent. It intentionally creates fake users and businesses, sets tenant policies, moves three *synthetic* unresolved records to a `private` schema without Data API grants, verifies deny-by-default reads by both anon and authenticated users, and rehearses full data restoration. Data movement is **never** applied to real LeadFlow AI records.

Prerequisites for real Supabase staging: use real authentication JWTs instead of mocked request settings; ensure private schema is not exposed via Data API; validate all privileges for API and service roles; back up records; coordinate with guarded public-form changes; test admin-only access and audit logs; avoid accidental leaking through logs, scoring or exports. Most importantly: define a reviewed, approved mapping for the 39 unresolved records before any production cutover. The current original migration still aborts on unresolved owner records. Nothing here overrides that safety gate.

CI verifies PostgreSQL isolation properties only; it does not verify the actual Supabase platform configuration.
