import assert from "node:assert/strict";
import test from "node:test";
import {
  isValidLeadId,
  verifyLeadDeletion,
} from "../src/lib/lead-delete-guard.ts";

const own = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const other = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

test("validates only UUID-shaped lead ids", () => {
  assert.equal(isValidLeadId(own), true);
  for (const id of [
    "",
    "lead-1",
    "not-a-uuid",
    "' OR TRUE --",
    undefined,
    null,
    10,
    "aaaaaaaa-aaaa-9aaa-8aaa-aaaaaaaaaaaa",
  ]) {
    assert.equal(isValidLeadId(id), false, String(id));
  }
});

test("success requires exactly the requested row to be deleted", () => {
  assert.deepEqual(
    verifyLeadDeletion(own, [{ id: own }], null),
    { confirmed: true }
  );
});

test("RLS-denied or missing deletion is never silently reported as success", () => {
  for (const deletedRows of [null, [], [{ id: other }], [{ id: own }, { id: other }]]) {
    const state = verifyLeadDeletion(own, deletedRows, null);
    assert.equal(state.confirmed, false);
    assert.match(state.message, /not confirmed/);
  }
});

test("database error messages and tenant existence are never reflected to caller", () => {
  const state = verifyLeadDeletion(
    own,
    [],
    { code: "42501", message: "permission denied on private table" },
  );
  assert.equal(state.confirmed, false);
  assert.doesNotMatch(state.message, /private table|42501/);
});

test("invalid lead selection prevents false success even with returned row", () => {
  const state = verifyLeadDeletion("bad-id", [{ id: own }], null);
  assert.equal(state.confirmed, false);
  assert.match(state.message, /Invalid/);
});
