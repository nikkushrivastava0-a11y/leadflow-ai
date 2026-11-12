import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
const routeSource = readFileSync(
  new URL("../src/app/api/checkout/route.ts", import.meta.url),
  "utf8"
);
const compiledRoute = ts.transpileModule(routeSource, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
}).outputText;

function loadCheckout(env = {}) {
  const loadedModule = { exports: {} };
  const imports = [];
  const networkCalls = [];
  vm.runInNewContext(compiledRoute, {
    module: loadedModule,
    exports: loadedModule.exports,
    process: { env },
    require(name) {
      imports.push(name);
      assert.equal(name, "next/server", "Paused billing must not load provider/database code");
      return require(name);
    },
    fetch(...args) {
      networkCalls.push(args);
      throw new Error("Paused checkout must not contact an upstream service");
    },
  });
  return { POST: loadedModule.exports.POST, imports, networkCalls };
}

for (const authenticated of [false, true]) {
  test(`checkout denies ${authenticated ? "authenticated" : "unauthenticated"} payment claims without upstream work`, async () => {
    const { POST, imports, networkCalls } = loadCheckout();
    const response = await POST(new Request("https://example.test/api/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authenticated ? { Authorization: "Bearer synthetic-test-token" } : {}),
      },
      body: JSON.stringify({
        owner_id: "synthetic-other-owner",
        client_slug: "synthetic-other-business",
        amount: 1,
        currency: "INR",
        plan: "pro",
        razorpay_order_id: "order_synthetic",
        razorpay_payment_id: "pay_synthetic",
        razorpay_signature: "synthetic-signature",
      }),
    }));

    assert.equal(response.status, 503);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.deepEqual(await response.json(), { error: "Paid upgrades are not available yet." });
    assert.deepEqual(imports, ["next/server"]);
    assert.deepEqual(networkCalls, []);
  });
}

test("provider credentials and apparent feature flags cannot override the billing pause", async () => {
  const { POST, imports, networkCalls } = loadCheckout({
    NODE_ENV: "production",
    BILLING_ENABLED: "true",
    ENABLE_PAID_UPGRADES: "true",
    RAZORPAY_KEY_ID: "rzp_test_synthetic",
    RAZORPAY_KEY_SECRET: "synthetic-not-a-secret",
    NEXT_PUBLIC_RAZORPAY_KEY_ID: "rzp_test_synthetic",
  });
  const response = await POST(new Request("https://example.test/api/checkout", { method: "POST" }));

  assert.equal(response.status, 503);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), { error: "Paid upgrades are not available yet." });
  assert.deepEqual(imports, ["next/server"]);
  assert.deepEqual(networkCalls, []);
});
