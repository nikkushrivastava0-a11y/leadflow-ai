import assert from "node:assert/strict";
import test from "node:test";
import { reservePublicLeadSubmission } from "../src/lib/server/public-lead-guard.ts";

const fake = {
  slug: "synthetic-gym", name: "Synthetic Person",
  email: "sample@example.test", phone: "+91 90000 00000", honeypot: null,
};
const envKeys = ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN", "LEAD_GUARD_HASH_SECRET"] as const;
async function sandbox(run: () => Promise<void>) {
  const previous = envKeys.map((k) => process.env[k]);
  const oldFetch = globalThis.fetch;
  process.env.UPSTASH_REDIS_REST_URL = "https://fake-redis.upstash.io";
  process.env.UPSTASH_REDIS_REST_TOKEN = "synthetic-token";
  process.env.LEAD_GUARD_HASH_SECRET = "synthetic-only-pepper-40-characters-long-abcdef";
  try { await run(); } finally {
    globalThis.fetch = oldFetch;
    envKeys.forEach((k, i) => {
      if (previous[i] === undefined) delete process.env[k];
      else process.env[k] = previous[i];
    });
  }
}

test("malformed JSON, network outage and non-numeric provider results fail closed", async () => {
  await sandbox(async () => {
    const mocked = [
      async () => new Response("not json", { status: 200 }),
      async () => { throw new Error("synthetic network outage"); },
      async () => new Response('{"result":true}', { status: 200 }),
      async () => new Response('{"result":null}', { status: 200 }),
      async () => new Response('{"result":4}', { status: 200 }),
    ];
    for (const handler of mocked) {
      globalThis.fetch = handler;
      const outcome = await reservePublicLeadSubmission(fake);
      assert.deepEqual(outcome, { allowed: false, reason: "unavailable" });
    }
  });
});

test("reservation release uses original token, not a new writer's key", async () => {
  await sandbox(async () => {
    const commands: unknown[][] = [];
    globalThis.fetch = async (_url, init) => {
      commands.push(JSON.parse(String(init?.body)));
      return new Response('{"result":1}', { status: 200 });
    };
    const reservation = await reservePublicLeadSubmission(fake);
    assert.equal(reservation.allowed, true);
    if (!reservation.allowed) return;
    await reservation.release();
    assert.equal(commands.length, 2);
    const reserve = commands[0];
    const release = commands[1];
    assert.equal(reserve[0], "EVAL");
    assert.equal(release[0], "EVAL");
    assert.equal(release[3], reserve[5], "same hashed duplicate Redis key");
    assert.equal(release[4], reserve[9], "same reservation token");
    assert.match(String(release[1]), /redis.call\('GET'/);
    assert.match(String(release[1]), /redis.call\('DEL'/);
  });
});

test("completion returns false on Redis failure, no fake success", async () => {
  await sandbox(async () => {
    let n = 0;
    globalThis.fetch = async () => {
      n++;
      return n === 1 ? new Response('{"result":1}') : new Response('{"result":0}');
    };
    const reservation = await reservePublicLeadSubmission(fake);
    assert.equal(reservation.allowed, true);
    if (reservation.allowed) assert.equal(await reservation.complete(), false);
    assert.equal(n, 2);
  });
});

test("tenant-specific HMAC keys are isolated with no plaintext contact information", async () => {
  await sandbox(async () => {
    const commands: unknown[][] = [];
    globalThis.fetch = async (_url, init) => {
      commands.push(JSON.parse(String(init?.body)));
      return new Response('{"result":1}');
    };
    const r1 = await reservePublicLeadSubmission(fake);
    const r2 = await reservePublicLeadSubmission({ ...fake, slug: "other-tenant" });
    assert.equal(r1.allowed, true);
    assert.equal(r2.allowed, true);
    const keys1 = commands[0].slice(3, 6);
    const keys2 = commands[1].slice(3, 6);
    assert.ok(keys1.every((v, i) => v !== keys2[i]));
    assert.ok(!JSON.stringify(commands).includes(fake.email));
    assert.ok(!JSON.stringify(commands).includes(fake.phone));
  });
});
