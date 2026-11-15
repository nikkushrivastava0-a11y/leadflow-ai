-- PRIVATE OPERATOR TEMPLATE ONLY. Do not commit populated manifests or PII.
-- Creates session-local input tables; no public/client/lead rows changed here.
-- Fill from independently reviewed encrypted/private CSVs in the same session.
CREATE TEMP TABLE leadflow_owner_manifest(
 client_id bigint PRIMARY KEY,
 owner_user_id uuid UNIQUE NOT NULL,
 evidence_ref text NOT NULL
);
CREATE TEMP TABLE leadflow_quarantine_manifest(
 id uuid PRIMARY KEY,
 evidence_ref text NOT NULL
);
CREATE TEMP TABLE leadflow_release_receipt(
 clients_count bigint,
 leads_count bigint,
 quarantine_count bigint,
 clients_sha256 text,
 leads_sha256 text,
 schema_sha256 text,
 backup_sha256 text,
 backup_reference text,
 restore_receipt text,
 approved_commit text,
 owner_manifest_sha256 text,
 quarantine_manifest_sha256 text
);
-- After private manifests are loaded, capture their canonical aggregate hashes
-- privately for the approval receipt. This is NOT approval by itself:
-- SELECT encode(sha256(convert_to(string_agg(to_jsonb(m)::text,',' ORDER BY client_id),'UTF8')),'hex') FROM pg_temp.leadflow_owner_manifest m;
-- SELECT encode(sha256(convert_to(string_agg(to_jsonb(q)::text,',' ORDER BY id),'UTF8')),'hex') FROM pg_temp.leadflow_quarantine_manifest q;
--
-- DO NOT set production/recovery approval sentinels in this template.
-- After separate explicit approval only, an operator sets exact approved commit,
-- maintenance and approval settings and invokes the reviewed SQL proposal.
