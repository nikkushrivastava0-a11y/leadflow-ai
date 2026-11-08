import test from "node:test";
import assert from "node:assert/strict";
import { isLeadStatus, LEAD_STATUSES } from "../src/lib/lead-status.ts";

test("all canonical stages are accepted", () => {
  for (const stage of LEAD_STATUSES) assert.equal(isLeadStatus(stage), true);
});

test("unrecognized and non-string stages are rejected", () => {
  for (const value of ["", "NEW", "archived", "won ", null, undefined, 1, {}, ["new"]]) {
    assert.equal(isLeadStatus(value), false);
  }
});
