import assert from "node:assert/strict";
import test from "node:test";
import { isValidBusinessSlug, validatePublicLead } from "../src/lib/public-leads.ts";

function enquiry(name = "Anita Demo", email = "anita@example.test", phone = "+91 98765 43210") {
  const form = new FormData();
  form.set("name", name);
  form.set("email", email);
  form.set("phone", phone);
  return form;
}

test("trims and normalises valid public enquiries", () => {
  const result = validatePublicLead(enquiry("  Anita  ", "  Anita@Example.TEST  "));
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.name, "Anita");
    assert.equal(result.value.email, "anita@example.test");
  }
});

test("rejects malformed email, short name and phone", () => {
  assert.equal(validatePublicLead(enquiry("A")).ok, false);
  assert.equal(validatePublicLead(enquiry("Anita", "not-an-email")).ok, false);
  assert.equal(validatePublicLead(enquiry("Anita", "a@example.test", "123")).ok, false);
});

test("rejects FormData File values and oversized fields", () => {
  const form = enquiry();
  form.set("name", new File(["ignored"], "fake.txt"));
  assert.equal(validatePublicLead(form).ok, false);
  assert.equal(validatePublicLead(enquiry("A".repeat(101))).ok, false);
});

test("rejects suspicious, empty and malformed business slugs", () => {
  assert.equal(isValidBusinessSlug("local-coaching-12"), true);
  assert.equal(isValidBusinessSlug(""), false);
  assert.equal(isValidBusinessSlug("../admin"), false);
  assert.equal(isValidBusinessSlug("name/extra"), false);
  assert.equal(isValidBusinessSlug("-business"), false);
  assert.equal(isValidBusinessSlug("business-"), false);
});
