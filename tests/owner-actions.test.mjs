import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";
import { validateFollowUp } from "../src/lib/follow-up.ts";

// Intercept only external boundaries; import and execute the actual actions.
const root = new URL("../src/lib/", import.meta.url);
const fixtureKey = Symbol.for("leadflow.ownerActions.offline");
const moduleUrl = (source) => "data:text/javascript," + encodeURIComponent(source);
const hook = registerHooks({
  resolve(specifier, context, nextResolve) {
    const actual = {
      "@/lib/dashboard-query": new URL("dashboard-query.ts", root).href,
      "@/lib/follow-up": new URL("follow-up.ts", root).href,
      "@/lib/manual-lead-validation": new URL("manual-lead-validation.ts", root).href,
    }[specifier];
    if (actual) return { url: actual, shortCircuit: true };
    if (specifier === "next/cache") return {
      url: moduleUrl('export function revalidatePath(path) { globalThis[Symbol.for("leadflow.ownerActions.offline")].revalidated.push(path); }'),
      shortCircuit: true,
    };
    if (specifier === "@/lib/server/owner-scope") return {
      url: moduleUrl('export async function resolveOwnerScope() { return globalThis[Symbol.for("leadflow.ownerActions.offline")].scope; } export function ownerScopeMessage() { return "Access unavailable"; }'),
      shortCircuit: true,
    };
    if (specifier === "@/lib/gemini") return {
      url: moduleUrl('export async function scoreLead() { throw new Error("AI must not run in owner update tests"); }'),
      shortCircuit: true,
    };
    return nextResolve(specifier, context);
  },
});
const { updateLeadStatus, deleteLead, updateLeadFollowUp } = await import(new URL("actions.ts", root));
hook.deregister();
const owner = "00000000-0000-4000-8000-000000000001";
const ids = Array.from({ length: 3 }, (_, i) => `00000000-0000-4000-8000-00000000001${i}`);

function fixture() {
  const state = {
    revalidated: [],
    rows: [
      { id: ids[0], client_slug: "business-a", user_id: owner, status: "new" },
      { id: ids[1], client_slug: null, user_id: owner, status: "new" },
      { id: ids[2], client_slug: "business-b", user_id: "other-owner", status: "new" },
    ],
    calls: [],
  };
  state.scope = { ok: true, userId: owner, slug: "business-a", supabase: { from(table) {
    assert.equal(table, "leads");
    const call = { filter: null, id: null, mode: null, patch: null };
    state.calls.push(call);
    const execute = () => {
      assert.equal(call.filter, `client_slug.eq.business-a,and(client_slug.is.null,user_id.eq.${owner})`);
      const row = state.rows.find(row => row.id === call.id && (row.client_slug === "business-a" || (row.client_slug === null && row.user_id === owner)));
      if (!row) return { data: call.mode === "delete" ? [] : null, error: null };
      if (call.mode === "delete") state.rows = state.rows.filter(candidate => candidate !== row);
      else Object.assign(row, call.patch);
      return { data: call.mode === "delete" ? [{ id: row.id }] : { id: row.id }, error: null };
    };
    const query = {
      update(patch) { call.mode = "update"; call.patch = patch; return query; },
      delete() { call.mode = "delete"; return query; },
      eq(key, value) { assert.equal(key, "id"); call.id = value; return query; },
      or(filter) { call.filter = filter; return query; },
      select() { return query; },
      maybeSingle() { return Promise.resolve(execute()); },
      then(resolve, reject) { return Promise.resolve(execute()).then(resolve, reject); },
    };
    return query;
  } } };
  globalThis[fixtureKey] = state;
  return state;
}

test("follow-up validation rejects malformed, ambiguous and impossible dates", () => {
  for (const invalid of [undefined, "", {}, "2026-11-13T11:00", "2026-02-30T12:00:00.000Z", "2026-11-13T11:00:00+05:30", "2026-11-13T25:00:00.000Z"]) {
    assert.equal(validateFollowUp(invalid).ok, false);
  }
  assert.deepEqual(validateFollowUp(null), { ok: true, value: null });
  assert.equal(validateFollowUp("2026-11-13T11:00:00.000Z").ok, true);
});

test("actual status/delete actions include visible legacy rows without accepting foreign rows", async () => {
  const state = fixture();
  assert.equal((await updateLeadStatus(ids[1], "contacted")).success, true);
  assert.equal(state.rows[1].status, "contacted");
  assert.ok((await updateLeadStatus(ids[2], "won")).error);
  assert.equal(state.rows[2].status, "new");
  assert.ok((await deleteLead(ids[2])).error);
  assert.equal((await deleteLead(ids[1])).success, true);
  assert.equal(state.rows.some(row => row.id === ids[1]), false);
  assert.equal(state.rows.some(row => row.id === ids[2]), true);
});

test("actual follow-up action saves, changes, clears, rejects foreign and unauthenticated writes", async () => {
  const state = fixture();
  const timestamp = "2026-11-13T11:00:00.000Z";
  assert.equal((await updateLeadFollowUp(ids[0], timestamp)).success, true);
  assert.equal(state.rows[0].next_follow_up_at, timestamp);
  assert.equal((await updateLeadFollowUp(ids[0], "2026-11-14T12:30:00.000Z")).success, true);
  assert.equal((await updateLeadFollowUp(ids[0], null)).success, true);
  assert.equal(state.rows[0].next_follow_up_at, null);
  assert.ok((await updateLeadFollowUp(ids[2], timestamp)).error);
  assert.equal(state.rows[2].next_follow_up_at, undefined);
  const count = state.calls.length;
  assert.ok((await updateLeadFollowUp(ids[0], "2026-02-30T12:00:00.000Z")).error);
  assert.equal(state.calls.length, count);
  state.scope = { ok: false, reason: "not_authenticated" };
  assert.ok((await updateLeadFollowUp(ids[0], timestamp)).error);
  assert.equal(state.calls.length, count);
});

test("database errors and zero-row writes cannot report follow-up success", async () => {
  const state = fixture();
  state.scope.supabase.from = () => {
    const query = {
      update() { return query; }, eq() { return query; }, or() { return query; }, select() { return query; },
      maybeSingle() { return Promise.resolve({ data: null, error: { code: "42703" } }); },
    };
    return query;
  };
  assert.ok((await updateLeadFollowUp(ids[0], null)).error);
  assert.deepEqual(state.revalidated, []);
  const zeroRows = fixture();
  zeroRows.rows = [];
  assert.ok((await updateLeadFollowUp(ids[0], null)).error);
  assert.deepEqual(zeroRows.revalidated, []);
});
