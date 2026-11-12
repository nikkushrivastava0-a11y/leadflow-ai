import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const script = readFileSync(
  "security/proposals/p0-05-reviewed-rls.sql",
  "utf8"
);
const audit = readFileSync(
  "security/proposals/p0-05-readonly-audit.sql",
  "utf8"
);

test("planned migration blocks unreviewed deployment and refuses unknown data ownership", () => {
  assert.match(script, /reviewed_rls_release/);
  assert.match(script, /APPROVED_IN_STAGING/);
  assert.match(script, /RAISE EXCEPTION 'Unmatched client owner/);
  assert.match(script, /RAISE EXCEPTION 'Ambiguous legacy leads/);
  assert.match(script, /BEGIN;/);
  assert.match(script, /COMMIT;/);
});

test("planned grants deny public/anonymous access and require RLS", () => {
  assert.match(script, /clients ENABLE ROW LEVEL SECURITY/i);
  assert.match(script, /leads ENABLE ROW LEVEL SECURITY/i);
  assert.match(script, /REVOKE ALL PRIVILEGES ON TABLE public\.clients FROM anon, authenticated, PUBLIC/i);
  assert.match(script, /REVOKE ALL PRIVILEGES ON TABLE public\.leads FROM anon, authenticated, PUBLIC/i);
  assert.doesNotMatch(script, /^\s*GRANT\s+.+\s+TO\s+anon\b/gim);
  assert.match(script, /CREATE POLICY leads_owner_select/);
  assert.match(script, /CREATE POLICY leads_owner_insert/);
  assert.match(script, /CREATE POLICY leads_owner_update/);
  assert.match(script, /CREATE POLICY leads_owner_delete/);
});

test("the read-only audit includes only SELECT statements", () => {
  const content = audit
    .replace(/--[^\n]*/g, "")
    .replace(/\s+/g, " ")
    .trim();
  assert.match(content, /^SELECT\b/i);
  assert.doesNotMatch(content, /\b(?:INSERT|UPDATE|DELETE|TRUNCATE|DROP|ALTER|GRANT|REVOKE|CREATE)\b/i);
});

test("reviewed proposal isn't in auto-applied migrations directory", () => {
  assert.match(script, /DO NOT APPLY TO PRODUCTION/);
  assert.doesNotMatch(script, /\b(?:DROP TABLE|TRUNCATE TABLE|DELETE FROM public\.leads)\b/i);
});
