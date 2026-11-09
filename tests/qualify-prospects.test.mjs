import test from "node:test";
import assert from "node:assert/strict";
import { qualifyProspects } from "../scripts/qualify-prospects.mjs";
const base = { businessName: "Example Coaching", area: "Greater Noida", service: "Exam preparation", sourceUrl: "https://example.com/about", verifiedAt: new Date().toISOString().slice(0,10) };
test("valid public business stays founder-review-only", () => {
  const [r] = qualifyProspects([base]);
  assert.equal(r.status, "needs_founder_review");
  assert.equal(r.sourceUrl, base.sourceUrl);
  assert.equal(r.officialUrl, null);
});
test("duplicates flagged, never silently merged", () => {
  const rows = qualifyProspects([base, {...base, businessName:" example   coaching "}]);
  assert.equal(rows[1].status, "duplicate");
});
test("unverified source requires verification", () => {
  const [r] = qualifyProspects([{...base, sourceUrl:"http://localhost/private", verifiedAt:"2020-01-01"}]);
  assert.equal(r.status, "needs_source_verification");
  assert.equal(r.sourceUrl, null);
});
test("rejects personal contact fields and malformed input", () => {
  assert.throws(() => qualifyProspects([{...base, email:"person@example.com"}]), /Disallowed fields/);
  assert.throws(() => qualifyProspects({}), /Expected an array/);
  assert.throws(() => qualifyProspects([null]), /Invalid record/);
});
test("invalid official URL cannot be carried into output", () => {
  const [r] = qualifyProspects([{...base, officialUrl:"https://127.0.0.1/"}]);
  assert.equal(r.officialUrl, null);
  assert.ok(r.reasons.includes("invalid_official_https_url"));
});
