# Atomic production cutover proposal — prepared, never executed

The candidate now includes one exact SQL transaction that combines reviewed quarantine, explicitly approved owner mapping, follow-up schema and owner RLS/grants. It replaces the earlier two-step staging sequence as the **production review proposal**. It is not authorization to execute and has no auto-migration hook.

## Files

| File | Purpose |
| --- | --- |
| `security/proposals/production-atomic-cutover.sql` | One atomic, separately gated production cutover proposal |
| `security/proposals/production-atomic-recovery.sql` | Separately approved unchanged-state recovery under restrictive access holds |
| `security/proposals/release-readonly-snapshot.sql` | Read-only counts/full-row SHA256/schema-policy-ACL fingerprints |
| `security/proposals/release-private-input-template.sql` | Empty session-local input table definitions, never populated in Git |
| `security/tests/production-atomic-cutover.mjs` | Exact transaction + actual `pg_dump`/restore rehearsal on synthetic94 |

## Concrete input contract

A private authorized operator prepares all three temporary tables in **the same database session**, with `ON_ERROR_STOP` enabled. No manifest row or customer contact belongs in public GitHub, screenshots, CI output or chat.

1. **Owner manifest:** one `client_id → owner_user_id` mapping per existing business, unique on both sides, with a private `evidence_ref` to the owner's explicit onboarding/consent record. Every UUID must identify a confirmed Auth user. Matching email, contact similarity and user metadata cannot choose a business owner. The current live audit has 7 unique email candidates; those remain candidates until approved privately.
2. **Quarantine manifest:** exact lead IDs approved to become inaccessible to ordinary tenants, each with a private review reference. Current aggregate scope is 39 (5 unknown slugs + 34 unprovisioned legacy), but execution rechecks the actual current set using the explicit owner manifest. Quarantine preserves IDs and every source field without assigning an owner; approval of quarantine is an alternative to immediately resolving every legacy owner.
3. **Backup/restore and release receipt:** one row containing the read-only snapshot counts/hashes, expected quarantine count, encrypted backup reference and actual archive SHA256, independently verified restore receipt, approved candidate commit SHA40, and canonical hashes of both private manifests. The template defines exact field order/types. Receipt completeness is checked in SQL, but SQL cannot establish that an operator's claimed backup/consent is true; those evidence records must actually be reviewed.

The SQL checks the receipt's commit against the explicitly approved session commit and rejects manifests changed since their approved canonical hashes. This prevents silently substituting IDs or ownership mappings after the package was reviewed. Hashes are evidence of equality, not consent or authorization.

## What the atomic transaction does

- Requires separate approval for the exact production commit and verified maintenance. Acquires exclusive locks on `clients`/`leads` with bounded lock/statement timeouts.
- Refuses existing owner/release schemas, unexpected policies, inbound lead foreign keys, custom client/lead triggers, incomplete/duplicate owner mappings, unconfirmed Auth users, absent provenance, stale snapshots and mismatched quarantine manifests.
- Confirms source full-row and schema/policy/ACL hashes still match the backed-up/restored snapshot under those locks.
- Creates a new unexposed `leadflow_release_backup` schema, RLS-enabled restricted receipt/quarantine tables and no normal API/service-role privileges. The operator must independently confirm the schema is excluded from the Data API exposed schemas.
- Adds the nullable follow-up field, moves only the exact approved unresolved rows into restricted quarantine and sets `clients.owner_user_id` **only from the approved UUID manifest**. No email-based owner inference occurs.
- Installs the reviewed five owner policies and narrow grants in that same transaction. Revokes old table **and column** grants, so hidden column ACLs cannot retain anonymous access or owner-field mutation privileges.
- Checks source + quarantine row conservation, original full-row content for every lead/client, and absence of unresolved rows in the remaining exposure set before its single `COMMIT`.

For the audited94 scope, the planned result is 55 provisionally reviewed leads in the owner-scoped CRM and 39 intact private rows. Every number/hash must be refreshed before approval; no data count is silently assumed. Existing owner emails and other original fields remain unchanged. Existing billing tables/services are outside this proposal; integrate any separately approved billing schema in the final coordinated release plan. Public intake must remain closed (`PUBLIC_ENQUIRIES_ENABLED=false`) during cutover and until the separately reviewed existing-Postgres guard proposal `security/proposals/p0-postgres-enquiry-guard.sql` is applied, its service-role-only RPC/tenant concurrency tests pass, and the server-only writer credential is securely configured. That alternative uses the existing database rather than a new Redis service; this transaction does not enable intake or assume the credential exists.

## Free backup and recovery path

Official Supabase backup documentation recommends exports for free-tier projects; provider daily backups and PITR must not be assumed to exist or activated for this task. Existing free PostgreSQL tools can create a logical backup, and a free disposable PostgreSQL instance can rehearse restore. See [Database Backups](https://supabase.com/docs/guides/platform/backups) and [Backup/Restore](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore).

**What was verified here:** a real custom-format `pg_dump` archive of the synthetic fixture was SHA256-hashed, restored using `pg_restore` into another new local database, and compared using full-row counts/hashes plus source column/constraint/policy/ACL fingerprints. Restored content and schema matched exactly before the atomic transaction test. All records were synthetic; this is not a backup of the hosted project.

**What is still required for production:** a genuine existing-project logical backup, encrypted private storage, its verified restore evidence and a secure authorized recovery target. The current connected SQL tool can inspect counts/schema; it is not a `pg_dump` session and exposes no database-password/export credential. No backup-download/export tool was found in the connected Supabase tool surface. We did not retrieve secrets, print source rows, export real customer data through SQL or create a paid backup service.

Use an existing secure database credential/session when authorized; never paste passwords/connection URLs in chat or commit a populated `.pgpass`. Supabase's filtered CLI export handles managed schemas/roles differently from a raw whole-database dump. A production backup must include the affected data, schema, policies, grants, relevant Auth identities/dependencies and the role/config information needed for recovery; inspect and rehearse compatibility rather than assuming the small synthetic archive proves a managed-platform dump is restorable. Auth/provider/Storage settings and objects are separate from database table content. Do not copy customer data to a new external recovery destination without appropriate authorization.

The production transaction stores only a restricted backup receipt and quarantined rows; it does not take or certify the external backup itself. A partial receipt, a hash without its archive, or a successful synthetic CI run cannot satisfy the real backup gate.

## Recovery behavior

`production-atomic-recovery.sql` needs a separate exact recovery approval and verified maintenance. It restores quarantined rows only if no ID collisions, newer edits, missing rows or changed original-field hashes exist. It adds restrictive deny policies for all normal client/lead access, preserves the new schema and recovery copy, and never restores broad old anonymous grants.

Recovery therefore restores content for administrator review while customer access remains held closed. It is not a shortcut to release the old insecure schema. Newer records/edits cause the recovery transaction to abort intact; retain them and prepare a reviewed delta/PITR plan rather than overwrite. Reopening access after recovery requires another explicit reviewed release.

## Rehearsal evidence and commands

Run only against a new loopback-only disposable database named `leadflow_atomic_*`, with PostgreSQL17 `psql`, `pg_dump`, `pg_restore` and `createdb` on PATH:

```bash
export LEADFLOW_SYNTHETIC_ONLY=YES
export PGHOST=127.0.0.1
export PGPORT=5432
export PGUSER=postgres
# PGPASSWORD, if needed, belongs only to this disposable fixture.
createdb leadflow_atomic_rehearsal
PGDATABASE=leadflow_atomic_rehearsal node security/tests/production-atomic-cutover.mjs
```

The runner creates synthetic-only schema/records, a private temporary archive and a randomly named restore database. The archive is removed after verification; databases remain disposable test artifacts for the caller to stop/remove with its local cluster. It never drops an existing database. Sensitive raw SQL/process stderr is suppressed in failure output.

Passed in the dedicated free local PostgreSQL17.11 cluster:

- Actual backup + restore of94 fake leads; full-row/source schema/policy/ACL fingerprints match.
- Missing approval, absent restore receipt, changed private manifests, absent owner provenance, different approved commit, substituted same-sized quarantine set and stale source snapshot all fail closed.
- An injected failure immediately before commit rolls back quarantine transfer, owner schema, grants/policies and every original row; source fingerprints remain exact.
- Successful exact atomic transaction preserves94 originals, leaves55 scoped +39 private, uses approved owners despite deliberately nonmatching old owner emails, removes broad column grants and allows only owner-scoped follow-up updates.
- Anonymous/authenticated/service-role quarantine reads denied; tenant A/B counts54/1.
- Separate recovery approval enforced; newer edits rejected without partial restoration; unchanged-state recovery restores all94 under restrictive client/lead access holds.

The earlier real local Supabase Auth→PostgREST JWT test verifies the same reviewed owner policy behavior. This new transaction test exercises exact cutover SQL and backup/restore mechanics using synthetic Auth functions; it does not claim the hosted candidate/browser/public-enquiry journey is verified.

## Smallest remaining private inputs and approval

Before a production approval question can be concrete, obtain the reviewed7-owner UUID/provenance manifest, the exact39-row private quarantine approval manifest, and a real encrypted-backup/verified-restore receipt with refreshed source/schema hashes. Once hosted application acceptance and the coordinated release package pass, request approval for that exact candidate SHA, those manifest/backup digests and a maintenance window. No production SQL, record movement, ownership assignment or grants were changed in this session.

## CI PostgreSQL client version

The synthetic runner can use the already-running official PostgreSQL17 CI service's own `pg_dump`/`pg_restore` via `LEADFLOW_SYNTHETIC_PG_CONTAINER`. The container ID must be a hexadecimal service ID. Archive bytes are streamed to a private temporary file and fed to restore; no hosted credentials or real backup are involved. This avoids a runner-host client/server major-version mismatch. Standalone local rehearsal uses installed matching native clients.
