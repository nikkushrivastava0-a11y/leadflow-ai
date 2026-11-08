import assert from "node:assert/strict";
import test from "node:test";
import { scoreLead } from "../src/lib/gemini.ts";

const input = {
  name: "Synthetic Lead",
  email: "synthetic@example.test",
  phone: "1234567890",
  source: "referral",
  notes: "Would like a callback.",
};

test("missing API key uses explicitly identified rule-based scoring", async () => {
  const previousKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  try {
    const result = await scoreLead(input);
    assert.equal(result.score, 80);
    assert.match(result.reason, /Rule-based estimate/);
    assert.match(result.reason, /AI unavailable/);
  } finally {
    if (previousKey !== undefined) process.env.GEMINI_API_KEY = previousKey;
  }
});

test("valid Gemini zero score is preserved (not overwritten with 50)", async () => {
  const previousKey = process.env.GEMINI_API_KEY;
  const previousFetch = globalThis.fetch;
  process.env.GEMINI_API_KEY = "example-test-key";
  globalThis.fetch = async () =>
    new Response(JSON.stringify({
      candidates: [{
        content: { parts: [{ text: '{"score":0,"reason":"Not qualified"}' }] },
      }],
    }), { status: 200, headers: { "Content-Type": "application/json" } });

  try {
    const result = await scoreLead(input);
    assert.equal(result.score, 0);
    assert.equal(result.reason, "Not qualified");
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previousKey;
  }
});

test("invalid model response falls back and does not claim AI scoring", async () => {
  const previousKey = process.env.GEMINI_API_KEY;
  const previousFetch = globalThis.fetch;
  process.env.GEMINI_API_KEY = "example-test-key";
  globalThis.fetch = async () =>
    new Response(JSON.stringify({
      candidates: [{
        content: { parts: [{ text: '{"score":200,"reason":"Bad output"}' }] },
      }],
    }), { status: 200, headers: { "Content-Type": "application/json" } });

  try {
    const result = await scoreLead(input);
    assert.equal(result.score, 80);
    assert.match(result.reason, /Rule-based estimate/);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previousKey;
  }
});
