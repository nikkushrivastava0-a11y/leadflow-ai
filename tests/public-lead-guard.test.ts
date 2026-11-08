import assert from "node:assert/strict";
import test from "node:test";
import { reservePublicLeadSubmission } from "../src/lib/server/public-lead-guard.ts";

const input = {
  slug: "demo-coaching",
  name: "Synthetic Student",
  email: "synthetic.private@example.test",
  phone: "+91 98765 43210",
  honeypot: null,
};

const keys = [
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "LEAD_GUARD_HASH_SECRET",
] as const;

async function withEnvironment(
  run: () => Promise<void>,
  values: [string | undefined, string | undefined, string | undefined] = [
    "https://example-redis.upstash.io",
    "synthetic-token",
    "a-really-long-test-only-secret-with-more-than-32-chars",
  ]
) {
  const original = keys.map((key) => process.env[key]);
  const originalFetch = globalThis.fetch;
  keys.forEach((key, index) => {
    const val = values[index];
    if (val === undefined) delete process.env[key];
    else process.env[key] = val;
  });
  try {
    await run();
  } finally {
    globalThis.fetch = originalFetch;
    keys.forEach((key, index) => {
      const val = original[index];
      if (val === undefined) delete process.env[key];
      else process.env[key] = val;
    });
  }
}

test("fails closed without shared Redis or hashing secret", async () => {
  await withEnvironment(async () => {
    const value = await reservePublicLeadSubmission(input);
    assert.deepEqual(value, { allowed: false, reason: "unavailable" });
  }, [undefined, undefined, undefined]);
});

test("honeypot blocks automated submissions without network requests", async () => {
  await withEnvironment(async () => {
    globalThis.fetch = async () => { throw Error("Must not reach Redis"); };
    const value = await reservePublicLeadSubmission({
      ...input,
      honeypot: "https://spam-site.test",
    });
    assert.deepEqual(value, { allowed: false, reason: "spam" });
  });
});

test("one atomic Redis EVAL reserves, commit confirms and no PII enters keys", async () => {
  await withEnvironment(async () => {
    const bodies: string[] = [];
    globalThis.fetch = async (_url, init) => {
      bodies.push(String(init?.body));
      return new Response('{"result":1}', { status: 200 });
    };

    const value = await reservePublicLeadSubmission(input);
    assert.equal(value.allowed, true);
    if (!value.allowed) return;

    assert.equal(await value.complete(), true);
    assert.equal(bodies.length, 2);

    const command = JSON.parse(bodies[0]);
    assert.equal(command[0], "EVAL");
    assert.equal(command[2], 3);
    assert.match(command[1], /redis.call/);

    const serialized = bodies.join(" ");
    for (const pii of [
      "synthetic.private@example.test",
      "98765 43210",
      "Synthetic Student",
    ]) {
      assert.ok(!serialized.includes(pii), "No PII should be in Redis keys or commands");
    }
    assert.match(bodies[1], /completed/);
  });
});

test("rate limit, duplicate and provider failure all prevent insert", async () => {
  await withEnvironment(async () => {
    for (const [response, expected] of [
      [new Response('{"result":2}'), "rate_limited"],
      [new Response('{"result":3}'), "duplicate"],
      [new Response('{"error":"NOAUTH"}', { status: 401 }), "unavailable"],
      [new Response('{"result":"unexpected"}'), "unavailable"],
    ] as const) {
      globalThis.fetch = async () => response;
      const value = await reservePublicLeadSubmission(input);
      assert.deepEqual(value, { allowed: false, reason: expected });
    }
  });
});

test("release is compare-and-delete, never unconditionally drops a key", async () => {
  await withEnvironment(async () => {
    const commands: unknown[][] = [];
    globalThis.fetch = async (_url, init) => {
      commands.push(JSON.parse(String(init?.body)));
      return new Response('{"result":1}', { status: 200 });
    };
    const value = await reservePublicLeadSubmission(input);
    assert.equal(value.allowed, true);
    if (value.allowed) await value.release();
    const lua = commands[1][1];
    assert.equal(typeof lua, "string");
    assert.match(String(lua), /redis.call\('GET'/);
    assert.match(String(lua), /redis.call\('DEL'/);
  });
});

test("invalid/unsafe Redis URL fails closed rather than making arbitrary request", async () => {
  await withEnvironment(async () => {
    globalThis.fetch = async () => { throw Error("Must not call localhost"); };
    const value = await reservePublicLeadSubmission(input);
    assert.deepEqual(value, { allowed: false, reason: "unavailable" });
  }, ["http://localhost:6379", "synthetic-token", "a-really-long-test-only-secret-with-more-than-32-chars"]);
});
