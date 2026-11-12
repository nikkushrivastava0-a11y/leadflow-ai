import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { isValidBusinessSlug, validatePublicLead } from "../src/lib/public-leads.ts";
import * as receipts from "../src/lib/server/public-enquiry-receipt.ts";

const require = createRequire(import.meta.url);
const compiled = ts.transpileModule(readFileSync(new URL("../src/app/form/[slug]/page.tsx", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const secret = "synthetic-form-action-secret-not-live";

function fixture({ enabled = true, business = { slug: "business-a", owner_user_id: "synthetic-owner" }, insertError = null, committed = true, receipt } = {}) {
  const events = [];
  const jar = new Map(receipt ? [[receipts.ENQUIRY_RECEIPT_COOKIE, receipt]] : []);
  const client = {
    from(table) {
      return table === "clients" ? {
        select(columns) {
          events.push(["lookup", columns]);
          return { eq: () => ({ maybeSingle: async () => ({ data: business, error: null }) }) };
        },
      } : {
        insert: async (rows) => { events.push(["insert", rows]); return { error: insertError }; },
      };
    },
  };
  const dependencies = {
    "react/jsx-runtime": require("react/jsx-runtime"),
    "@/lib/server/public-submission-client": { createPublicSubmissionClient: () => client },
    "@/lib/public-leads": { isValidBusinessSlug, validatePublicLead },
    "@/lib/server/public-enquiry-receipt": receipts,
    "next/navigation": {
      redirect(url) { throw Object.assign(new Error("redirect"), { destination: url }); },
      notFound() { throw new Error("not-found"); },
    },
    "next/cache": { revalidatePath: path => events.push(["revalidate", path]) },
    "next/headers": { cookies: async () => ({
      get: name => jar.has(name) ? { value: jar.get(name) } : undefined,
      set: (name, value, options) => { jar.set(name, value); events.push(["cookie", options]); },
    }) },
    "@/lib/server/public-lead-guard": { reservePublicLeadSubmission: async () => {
      events.push(["reserve"]);
      return { allowed: true, release: async () => events.push(["release"]), complete: async () => { events.push(["complete"]); return committed; } };
    } },
  };
  const loadedModule = { exports: {} };
  vm.runInNewContext(compiled, { module: loadedModule, exports: loadedModule.exports,
    process: { env: { PUBLIC_ENQUIRIES_ENABLED: enabled ? "true" : undefined, LEAD_GUARD_HASH_SECRET: secret, NODE_ENV: "production" } },
    console: { error() {}, warn() {} },
    require: name => { assert.ok(Object.hasOwn(dependencies, name), `Unexpected import: ${name}`); return dependencies[name]; },
  });
  return { page: loadedModule.exports.default, events, jar };
}

function findForm(node) {
  if (!node || typeof node !== "object") return null;
  if (node.type === "form") return node;
  for (const child of [node.props?.children].flat(Infinity)) {
    const match = findForm(child);
    if (match) return match;
  }
  return null;
}
function text(node) {
  if (typeof node === "string") return node;
  if (!node || typeof node !== "object") return "";
  return [node.props?.children].flat(Infinity).map(text).join(" ");
}
const props = searchParams => ({ params: Promise.resolve({ slug: "business-a" }), searchParams: Promise.resolve(searchParams || {}) });
const input = () => {
  const form = new FormData();
  form.set("name", "Synthetic Enquiry");
  form.set("email", "synthetic@example.test");
  form.set("phone", "+91 98765 43210");
  return form;
};
async function submit(f, formData = input()) {
  const view = await f.page(props());
  const form = findForm(view);
  assert.ok(form, "Enabled fixture should render an action");
  try { await form.props.action(formData); assert.fail("Action must redirect"); }
  catch (error) { assert.ok(error.destination); return error.destination; }
}

test("disabled intake exposes no form and performs no database or guard work", async () => {
  const f = fixture({ enabled: false });
  const view = await f.page(props());
  assert.equal(findForm(view), null);
  assert.match(text(view), /not accepting online enquiries/);
  assert.equal(f.events.length, 0);
});
test("success URL without signed save receipt never claims a saved enquiry", async () => {
  const f = fixture();
  const view = await f.page(props({ success: "true" }));
  assert.match(text(view), /Submission status unavailable/);
  assert.doesNotMatch(text(view), /Your enquiry was saved/);
});
test("invalid details stop before guard or elevated database work", async () => {
  const f = fixture();
  const form = input(); form.set("email", "bad");
  assert.equal(await submit(f, form), "/form/business-a?error=invalid");
  assert.equal(f.events.length, 0);
});
for (const business of [null, { slug: "business-a", owner_user_id: null }, { slug: "other-business", owner_user_id: "synthetic-owner" }]) {
  test(`unknown or unprovisioned business cannot accept an enquiry (${business?.slug ?? "missing"}/${Boolean(business?.owner_user_id)})`, async () => {
    const f = fixture({ business });
    assert.equal(await submit(f), "/form/business-a?error=business");
    assert.equal(f.events.some(e => e[0] === "insert"), false);
    assert.equal(f.events.some(e => e[0] === "release"), true);
    assert.equal(f.jar.size, 0);
  });
}
test("database failure releases reservation and never issues success receipt", async () => {
  const f = fixture({ insertError: { code: "synthetic-failure" } });
  assert.equal(await submit(f), "/form/business-a?error=save");
  assert.equal(f.events.some(e => e[0] === "release"), true);
  assert.equal(f.jar.size, 0);
});
test("successful save remains truthful when duplicate-guard confirmation fails", async () => {
  const f = fixture({ committed: false });
  assert.equal(await submit(f), "/form/business-a?success=true");
  const inserted = f.events.find(e => e[0] === "insert")[1][0];
  assert.equal(inserted.client_slug, "business-a");
  assert.match(inserted.score_reason, /Unscored enquiry/);
  const cookie = f.events.find(e => e[0] === "cookie")[1];
  assert.equal(cookie.httpOnly, true);
  assert.equal(cookie.secure, true);
  assert.equal(cookie.sameSite, "lax");
  assert.equal(cookie.path, "/form/business-a");
  assert.equal(receipts.verifyEnquiryReceipt(f.jar.get(receipts.ENQUIRY_RECEIPT_COOKIE), "business-a", secret), true);
  assert.match(text(await f.page(props({ success: "true" }))), /Your enquiry was saved/);
});
