import test from "node:test";
import assert from "node:assert/strict";
import {
  isValidClientSlug,
  validatePublicLead,
} from "../src/lib/public-lead-validation.ts";

test("valid tenant slugs are strict and deterministic", () => {
  for (const slug of ["cafe-one", "coaching2026", "a1", "abc-123"]) {
    assert.equal(isValidClientSlug(slug), true, slug);
  }
  for (const slug of [
    "", "-bad", "bad-", "double--dash", "UPPER",
    " space", "../admin", "a".repeat(65), null, 123,
  ]) {
    assert.equal(isValidClientSlug(slug), false, String(slug));
  }
});

test("normalises typical Indian business enquiry input", () => {
  const out = validatePublicLead({
    name: "  Asha   Sharma  ",
    email: "  ASHA@Example.com ",
    phone: " +91 98765 43210 ",
  });
  assert.equal(out.ok, true);
  if (out.ok) {
    assert.deepEqual(out.value, {
      name: "Asha Sharma",
      email: "asha@example.com",
      phone: "+91 98765 43210",
    });
  }
});

test("rejects files, blank names and oversized values", () => {
  for (const name of [null, undefined, {}, " ", "A", "a".repeat(101)]) {
    const out = validatePublicLead({
      name, email: "x@example.com", phone: "9876543210",
    });
    assert.deepEqual(out, { ok: false, error: "invalid_name" });
  }
});

test("rejects malformed and oversized email addresses", () => {
  for (const email of ["a@", "invalid", "abc@example", "a b@example.com", "a".repeat(255), null]) {
    const out = validatePublicLead({
      name: "Asha Sharma", email, phone: "9876543210",
    });
    assert.deepEqual(out, { ok: false, error: "invalid_email" });
  }
});

test("rejects invalid phone syntax and number lengths", () => {
  for (const phone of ["12", "abcdefghij", "0000000000000000", "+91-123-foo-4567", null, "9".repeat(25)]) {
    const out = validatePublicLead({
      name: "Asha Sharma", email: "asha@example.com", phone,
    });
    assert.deepEqual(out, { ok: false, error: "invalid_phone" });
  }
});
