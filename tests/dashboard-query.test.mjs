import assert from "node:assert/strict";
import test from "node:test";
import {
  parseDashboardPage, normalizeLeadSearch, parseLeadStatus, buildTenantLeadFilter,
} from "../src/lib/dashboard-query.ts";

test("page parsing handles multiple digits and rejects malformed / expensive offsets", () => {
  for (const [value, expected] of [["1", 1], ["2", 2], ["10", 10], ["100", 100], ["999999", 999999]]) {
    assert.equal(parseDashboardPage(value), expected);
  }
  for (const value of [undefined, null, 2, "0", "-1", "01", "1 OR true", "1000000", "1.1", ""]) {
    assert.equal(parseDashboardPage(value), 1);
  }
});

test("search is bounded and cannot inject PostgREST logical operators", () => {
  assert.equal(normalizeLeadSearch(" Alice+sales@example.test "), "Alice+sales@example.test");
  assert.equal(normalizeLeadSearch("john),client_slug.not.is.null,"), "johnclient_slug.not.is.null");
  assert.equal(normalizeLeadSearch("x".repeat(500)).length, 80);
  assert.equal(normalizeLeadSearch(["a"]), "");
});

test("status is allowlisted", () => {
  for (const valid of ["new", "contacted", "qualified", "won", "lost"]) {
    assert.equal(parseLeadStatus(valid), valid);
  }
  for (const invalid of ["all", "won,or(true)", "", undefined, null, 42]) {
    assert.equal(parseLeadStatus(invalid), "all");
  }
});

test("search matches within each owner branch, never as an unrestricted OR branch", () => {
  const owner = buildTenantLeadFilter("business-a", "owner-a", "");
  assert.equal(owner, "client_slug.eq.business-a,and(client_slug.is.null,user_id.eq.owner-a)");
  const filtered = buildTenantLeadFilter("business-a", "owner-a", "Alice");
  assert.equal(
    filtered,
    "and(client_slug.eq.business-a,or(name.ilike.*Alice*,email.ilike.*Alice*,phone.ilike.*Alice*,source.ilike.*Alice*))," +
    "and(client_slug.is.null,user_id.eq.owner-a,or(name.ilike.*Alice*,email.ilike.*Alice*,phone.ilike.*Alice*,source.ilike.*Alice*))",
  );
  assert.ok(!filtered.includes("business-b"));
});
