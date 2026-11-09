import assert from "node:assert/strict";
import test from "node:test";
import {
  safeHttpsOrigin,
  trustedAuthOrigin,
  callbackRedirectUrl,
  extractPkceCode,
} from "../src/lib/auth-callback-origin.ts";

const canonical = "https://leadflow-ai-flame.vercel.app";

test("uses only explicitly trusted canonical redirect origin", () => {
  assert.equal(
    trustedAuthOrigin("https://malicious.example/auth/callback?code=synthetic"),
    canonical
  );
  assert.equal(
    trustedAuthOrigin(canonical + "/auth/callback?code=synthetic"),
    canonical
  );
});

test("a request host cannot override a trusted preview or configured origin", () => {
  const config = {
    callbackOrigin: "https://app.leadflow.example",
    vercelUrl: "leadflow-safe-branch.vercel.app",
    environment: "production",
  };
  assert.equal(
    trustedAuthOrigin("https://app.leadflow.example/auth/callback", config),
    "https://app.leadflow.example"
  );
  assert.equal(
    trustedAuthOrigin("https://leadflow-safe-branch.vercel.app/auth/callback", config),
    "https://leadflow-safe-branch.vercel.app"
  );
  assert.equal(
    trustedAuthOrigin("https://evil.vercel.app/auth/callback", config),
    "https://app.leadflow.example"
  );
  assert.equal(
    trustedAuthOrigin("http://app.leadflow.example/auth/callback", config),
    "https://app.leadflow.example"
  );
});

test("rejects poisoned config and forwarded host tricks", () => {
  for (const unsafe of [
    "https://example.com/@attacker",
    "https://attacker@trusted.example",
    "http://insecure.example",
    "javascript:alert(1)",
    "https://trusted.example/?next=https://attacker.example",
    "https://trusted.example/#bad",
    "https://trusted.example:444",
    "//attacker.example",
  ]) {
    assert.equal(safeHttpsOrigin(unsafe), null, unsafe);
    assert.equal(
      trustedAuthOrigin("https://untrusted.example/auth/callback", {
        callbackOrigin: unsafe,
        environment: "production",
      }),
      canonical,
      unsafe
    );
  }
});

test("local development origin cannot become an external arbitrary HTTP redirect", () => {
  assert.equal(
    trustedAuthOrigin("http://localhost:3000/auth/callback", {
      environment: "development",
    }),
    "http://localhost:3000"
  );
  assert.equal(
    trustedAuthOrigin("http://attacker.example/auth/callback", {
      environment: "development",
    }),
    "http://localhost:3000"
  );
});

test("ignores all untrusted next and redirect_uri query params", () => {
  const url =
    "https://malicious.example/auth/callback?" +
    "code=synthetic&next=https%3A%2F%2Fevil.example&" +
    "redirect_uri=%2F%2Fevil.example";
  const success = callbackRedirectUrl(url, true);
  const failure = callbackRedirectUrl(url, false);
  assert.equal(success.href, canonical + "/dashboard");
  assert.equal(failure.href, canonical + "/auth/auth-code-error");
  assert.equal(success.search, "");
  assert.equal(failure.search, "");
});

test("extracts only single bounded printable PKCE auth codes", () => {
  assert.equal(extractPkceCode(canonical + "/auth/callback?code=good_code-1"), "good_code-1");
  for (const raw of [
    canonical + "/auth/callback",
    canonical + "/auth/callback?code=",
    canonical + "/auth/callback?code=hello%0Aworld",
    canonical + "/auth/callback?code=" + "a".repeat(4097),
    "not-a-url",
  ]) {
    assert.equal(extractPkceCode(raw), null);
  }
});
