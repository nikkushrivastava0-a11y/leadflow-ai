import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
const { NextRequest } = require("next/server");
const compiled = ts.transpileModule(readFileSync(new URL("../src/proxy.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;

function loadProxy({ user = null, error = null, throws = false, cookieValue = "", clears = false } = {}) {
  const loadedModule = { exports: {} };
  vm.runInNewContext(compiled, {
    module: loadedModule, exports: loadedModule.exports, process: { env: {} }, URL,
    require(name) {
      if (name === "next/server") return require(name);
      assert.equal(name, "@supabase/ssr");
      return { createServerClient(_url, _key, options) {
        return { auth: { async getUser() {
          options.cookies.setAll([{ name: "synthetic-session", value: cookieValue, options: { path: "/", httpOnly: true, maxAge: clears ? 0 : 60 } }], { "Cache-Control": "private, no-store", Pragma: "no-cache", Expires: "0" });
          if (throws) throw new Error("synthetic-network-error");
          return { data: { user }, error };
        } } };
      } };
    },
  });
  return loadedModule.exports.proxy;
}

test("expired session redirect preserves cleared cookies and prevents caching", async () => {
  const response = await loadProxy({ clears: true })(new NextRequest("https://example.test/dashboard"));
  assert.equal(response.headers.get("location"), "https://example.test/login");
  assert.equal(response.cookies.get("synthetic-session")?.value, "");
  assert.match(response.headers.get("set-cookie"), /Max-Age=0/);
  assert.match(response.headers.get("cache-control"), /no-store/);
});
test("login redirect preserves refreshed session cookie", async () => {
  const response = await loadProxy({ user: { id: "synthetic-owner", email_confirmed_at: "2026-01-01" }, cookieValue: "synthetic-refreshed" })(new NextRequest("https://example.test/login"));
  assert.equal(response.headers.get("location"), "https://example.test/dashboard");
  assert.equal(response.cookies.get("synthetic-session")?.value, "synthetic-refreshed");
  assert.match(response.headers.get("cache-control"), /no-store/);
});
test("unverified user and provider errors cannot grant dashboard access", async () => {
  for (const options of [
    { user: { id: "synthetic-unverified" } },
    { user: { id: "synthetic-owner", email_confirmed_at: "2026-01-01" }, error: new Error("invalid") },
    { throws: true },
  ]) {
    const response = await loadProxy(options)(new NextRequest("https://example.test/dashboard"));
    assert.equal(response.headers.get("location"), "https://example.test/login");
  }
});
test("valid protected request keeps the refreshed cookie and private response", async () => {
  const response = await loadProxy({ user: { id: "synthetic-owner", email_confirmed_at: "2026-01-01" }, cookieValue: "synthetic-refreshed" })(new NextRequest("https://example.test/dashboard"));
  assert.equal(response.headers.get("location"), null);
  assert.equal(response.cookies.get("synthetic-session")?.value, "synthetic-refreshed");
  assert.match(response.headers.get("cache-control"), /private.*no-store/);
});
