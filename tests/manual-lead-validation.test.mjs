import assert from "node:assert/strict";
import test from "node:test";
import {
  validLeadId, validLeadStatus, validateManualLead,
} from "../src/lib/manual-lead-validation.ts";

const good = {
  name: "Synthetic Customer",
  email: "synthetic@example.test",
  phone: "+91 98765 43210",
  source: "manual",
  notes: "Please call about class fees",
};

test("validates and normalizes owner-created leads", () => {
  const result = validateManualLead({ ...good, name: " Synthetic Customer  ", email: " TEST@EXAMPLE.TEST " });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.name, "Synthetic Customer");
    assert.equal(result.value.email, "test@example.test");
    assert.equal(result.value.source, "manual");
  }
});
test("rejects invalid/unknown sources, malformed contact info and missing contact", () => {
  for (const invalid of [
    { ...good, source: "ignore_previous_instructions" },
    { ...good, email: "not-an-email" },
    { ...good, phone: "+91 12" },
    { ...good, email: "", phone: "" },
    { ...good, name: "X" },
    { ...good, notes: "N".repeat(1001) },
  ]) {
    assert.equal(validateManualLead(invalid).ok, false);
  }
});
test("optional phone is permitted if email exists, and vice versa", () => {
  assert.equal(validateManualLead({ ...good, phone: "" }).ok, true);
  assert.equal(validateManualLead({ ...good, email: "" }).ok, true);
});
test("status and lead IDs must match exact contract", () => {
  for (const status of ["new", "contacted", "qualified", "won", "lost"]) {
    assert.equal(validLeadStatus(status), true);
  }
  for (const status of ["admin", "archived", null, undefined, 1]) {
    assert.equal(validLeadStatus(status), false);
  }
  assert.equal(validLeadId("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"), true);
  assert.equal(validLeadId("' OR TRUE --"), false);
});
