import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_SITE_ORIGIN,
  getSiteOrigin,
} from "../src/lib/site-origin.ts";

test("official marketing URL remains the fallback", () => {
  assert.equal(getSiteOrigin(undefined), DEFAULT_SITE_ORIGIN);
  assert.equal(getSiteOrigin(""), DEFAULT_SITE_ORIGIN);
});

test("a verified HTTPS canonical host strips the trailing slash", () => {
  assert.equal(
    getSiteOrigin("https://leadflow.example.org/"),
    "https://leadflow.example.org"
  );
});

test("rejects misleading, private or malformed origin inputs", () => {
  for (const invalid of [
    "http://leadflow.example.org",
    "javascript:alert(1)",
    "https://user:password@leadflow.example.org",
    "https://leadflow.example.org/dashboard",
    "https://leadflow.example.org/?token=abc",
    "https://leadflow.example.org/#section",
    "ftp://leadflow.example.org",
    "not a url",
  ]) {
    assert.equal(getSiteOrigin(invalid), DEFAULT_SITE_ORIGIN);
  }
});
