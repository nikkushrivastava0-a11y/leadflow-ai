import test from "node:test";
import assert from "node:assert/strict";
import { selectVisibleLeads } from "../src/lib/lead-table-controls.ts";

function row(id, name, status, score, created_at, email = null, phone = null, source = "manual") {
  return {
    id, name, status, score, created_at, email, phone, source,
    notes: null, user_id: "synthetic-user", updated_at: created_at,
    email_sent: false, score_reason: null,
  };
}

const data = [
  row("a", "Anita", "new", 90, "2026-11-01T10:00:00Z", "anita@example.test", "9999900000", "referral"),
  row("b", "Rahul", "contacted", 60, "2026-11-05T10:00:00Z", "rahul@example.test", "9999900001", "website"),
  row("c", "Naman", "won", 90, "2026-11-03T10:00:00Z", "naman@example.test", "9999900002", "social"),
  row("d", "Amit", "new", 20, "2026-11-07T10:00:00Z", null, null, "manual"),
  row("e", "Neha", "new", 15, "bad-timestamp", "neha@example.test"),
];
const filters = { query: "", status: "all", sort: "newest", page: 1, pageSize: 10 };

test("shows newest entries first, bad date last; does not mutate input", () => {
  const snapshot = JSON.stringify(data);
  const view = selectVisibleLeads(data, filters);
  assert.deepEqual(view.rows.map(x => x.id), ["d", "b", "c", "a", "e"]);
  assert.equal(view.matching, 5);
  assert.equal(view.start, 1);
  assert.equal(view.end, 5);
  assert.equal(JSON.stringify(data), snapshot);
});

test("searches name, email, phone and source case-insensitively", () => {
  for (const [query, id] of [
    ["anITA", "a"],
    ["RAHUL@EXAMPLE", "b"],
    ["0002", "c"],
    ["REFERRAL", "a"],
  ]) {
    const view = selectVisibleLeads(data, { ...filters, query });
    assert.deepEqual(view.rows.map(x => x.id), [id], query);
  }
});

test("combines text and status without leaking non-matching rows", () => {
  const view = selectVisibleLeads(data, {
    ...filters,
    query: "a",
    status: "new",
    sort: "name",
  });
  assert.deepEqual(view.rows.map(x => x.id), ["d", "a", "e"]);
});

test("sorts score, name, and oldest deterministically", () => {
  const high = selectVisibleLeads(data, { ...filters, sort: "score-desc" });
  assert.deepEqual(high.rows.map(x => x.id), ["a", "c", "b", "d", "e"]);
  const low = selectVisibleLeads(data, { ...filters, sort: "score-asc" });
  assert.deepEqual(low.rows.map(x => x.id), ["e", "d", "b", "a", "c"]);
  const byName = selectVisibleLeads(data, { ...filters, sort: "name" });
  assert.deepEqual(byName.rows.map(x => x.id), ["d", "a", "c", "e", "b"]);
  const oldest = selectVisibleLeads(data, { ...filters, sort: "oldest" });
  assert.equal(oldest.rows[0].id, "e");
});

test("paginates exactly, clamps stale page indices", () => {
  const page2 = selectVisibleLeads(data, { ...filters, pageSize: 2, page: 2 });
  assert.deepEqual(page2.rows.map(x => x.id), ["c", "a"]);
  assert.deepEqual(
    { page: page2.page, pages: page2.totalPages, start: page2.start, end: page2.end },
    { page: 2, pages: 3, start: 3, end: 4 },
  );
  const stale = selectVisibleLeads(data, { ...filters, pageSize: 2, page: 90 });
  assert.equal(stale.page, 3);
  assert.deepEqual(stale.rows.map(x => x.id), ["e"]);
  const invalid = selectVisibleLeads(data, { ...filters, pageSize: 0, page: -5 });
  assert.equal(invalid.page, 1);
  assert.equal(invalid.rows.length, 5);
});

test("empty and unmatched search states do not imply deletion", () => {
  const none = selectVisibleLeads(data, { ...filters, query: "not found" });
  assert.equal(none.matching, 0);
  assert.deepEqual(none.rows, []);
  assert.equal(none.totalPages, 1);
  assert.equal(none.start, 0);
  assert.equal(none.end, 0);
  const empty = selectVisibleLeads([], filters);
  assert.equal(empty.matching, 0);
});
