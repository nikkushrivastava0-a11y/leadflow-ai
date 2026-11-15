import assert from "node:assert/strict";
import test from "node:test";
import { createPublicSubmissionClient } from "../src/lib/server/public-submission-client.ts";

const variables = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SECRET_KEY"];

async function withEnv(values, run) {
  const before = variables.map(k => process.env[k]);
  try {
    for (const [key, value] of Object.entries(values)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    await run();
  } finally {
    variables.forEach((key, i) => {
      if (before[i] === undefined) delete process.env[key];
      else process.env[key] = before[i];
    });
  }
}

test("does not create privileged client when secret configuration is missing", async () => {
  await withEnv({
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_SECRET_KEY: undefined,
  }, async () => {
    assert.equal(createPublicSubmissionClient(), null);
  });
});

test("rejects browser publishable/anon keys and invalid URL inputs", async () => {
  for (const [url, key] of [
    ["https://example.supabase.co", "sb_publishable_not_a_secret"],
    ["https://example.supabase.co", "an_old_anon_key"],
    ["https://example.supabase.co", "sb_secret_short"],
    ["http://example.supabase.co", "sb_secret_test_only_fake_long_12345"],
    ["https://example.supabase.co/dashboard", "sb_secret_test_only_fake_long_12345"],
    ["https://evil.example.org", "sb_secret_test_only_fake_long_12345"],
  ]) {
    await withEnv({
      NEXT_PUBLIC_SUPABASE_URL: url,
      SUPABASE_SECRET_KEY: key,
    }, async () => {
      assert.equal(createPublicSubmissionClient(), null);
    });
  }
});

test("synthetic server-only key creates a separate client without network I/O", async () => {
  await withEnv({
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_SECRET_KEY: "sb_secret_synthetic_offline_nonproduction_test_123456",
  }, async () => {
    const client = createPublicSubmissionClient();
    assert.ok(client);
    assert.equal(typeof client.from, "function");
  });
});
