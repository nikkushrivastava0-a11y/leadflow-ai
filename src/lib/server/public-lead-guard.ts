import { createHmac, randomUUID } from "node:crypto";

/**
 * Shared, atomic guard for anonymous server-action submissions.
 * In-memory counters do NOT protect Vercel/serverless instances.
 * Redis is required and absence of configuration FAILS CLOSED.
 * 
 * Two independent 1-hour rate limits: 60 submissions per business and
 * 4 attempts per contact. A short reservation prevents rapid duplicates.
 * This is NOT a database-level exactly-once guarantee. 
 */

const RATE_LUA = [
  "local total=redis.call('INCR',KEYS[1])",
  "if total==1 then redis.call('EXPIRE',KEYS[1],tonumber(ARGV[1])) end",
  "local contact=redis.call('INCR',KEYS[2])",
  "if contact==1 then redis.call('EXPIRE',KEYS[2],tonumber(ARGV[1])) end",
  "if total>tonumber(ARGV[2]) or contact>tonumber(ARGV[3]) then return 2 end",
  "local reserved=redis.call('SET',KEYS[3],ARGV[4],'NX','EX',tonumber(ARGV[5]))",
  "if not reserved then return 3 end",
  "return 1",
].join("\n");

const COMMIT_LUA = [
  "if redis.call('GET',KEYS[1])==ARGV[1] then",
  "  redis.call('SET',KEYS[1],'completed','EX',tonumber(ARGV[2]))",
  "  return 1",
  "end",
  "return 0",
].join("\n");

const RELEASE_LUA = [
  "if redis.call('GET',KEYS[1])==ARGV[1] then",
  "  return redis.call('DEL',KEYS[1])",
  "end",
  "return 0",
].join("\n");

type RedisConfig = {
  url: string;
  token: string;
  pepper: string;
};

export type GuardDenyReason =
  | "unavailable"
  | "rate_limited"
  | "duplicate"
  | "spam";

export type LeadGuardResult =
  | { allowed: false; reason: GuardDenyReason }
  | {
      allowed: true;
      complete(): Promise<boolean>;
      release(): Promise<void>;
    };

function config(): RedisConfig | null {
  const rawUrl = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  const pepper = process.env.LEAD_GUARD_HASH_SECRET;

  if (!rawUrl || !token || !pepper || pepper.length < 32) return null;
  try {
    const url = new URL(rawUrl);
    if (
      url.protocol !== "https:" ||
      !url.hostname.endsWith(".upstash.io") ||
      url.username !== "" ||
      url.password !== "" ||
      url.search !== "" ||
      url.hash !== "" ||
      url.pathname !== "/"
    ) return null;
    return { url: url.origin, token, pepper };
  } catch {
    return null;
  }
}

function hash(key: string, pepper: string): string {
  return createHmac("sha256", pepper).update(key).digest("hex").slice(0, 40);
}

/** Returns a numeric Redis result or null on any provider/protocol error. */
async function redisEval(
  cfg: RedisConfig,
  script: string,
  keys: string[],
  args: Array<string | number>
): Promise<number | null> {
  try {
    const response = await fetch(cfg.url, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + cfg.token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(["EVAL", script, keys.length, ...keys, ...args]),
      signal: AbortSignal.timeout(4000),
      cache: "no-store",
    });

    if (!response.ok) return null;
    const payload: unknown = await response.json();
    if (
      !payload ||
      typeof payload !== "object" ||
      !("result" in payload)
    ) return null;

    const result = (payload as { result: unknown }).result;
    return typeof result === "number" && Number.isInteger(result) ? result : null;
  } catch {
    return null;
  }
}

export async function reservePublicLeadSubmission(input: {
  slug: string;
  name: string;
  email: string;
  phone: string;
  honeypot: FormDataEntryValue | null;
}): Promise<LeadGuardResult> {
  // Bots frequently fill invisible website fields. Do not persist their data.
  if (input.honeypot !== null && String(input.honeypot).trim()) {
    return { allowed: false, reason: "spam" };
  }

  const cfg = config();
  if (!cfg) return { allowed: false, reason: "unavailable" };

  const slug = input.slug.trim().toLowerCase();
  const contact = input.email.trim().toLowerCase() + "|" +
    input.phone.replace(/\D/g, "");
  const fingerprint = slug + "|" + contact + "|" +
    input.name.trim().toLowerCase();

  // Never send raw email/phone/name in Redis key names, metrics, or logs.
  const tenantKey = "lf:leads:tenant:" + hash(slug, cfg.pepper);
  const contactKey = "lf:leads:contact:" + hash(slug + "|" + contact, cfg.pepper);
  const duplicateKey = "lf:leads:duplicate:" + hash(fingerprint, cfg.pepper);
  const reservationToken = randomUUID();

  const code = await redisEval(
    cfg,
    RATE_LUA,
    [tenantKey, contactKey, duplicateKey],
    [3600, 60, 4, reservationToken, 90]
  );

  if (code === 2) return { allowed: false, reason: "rate_limited" };
  if (code === 3) return { allowed: false, reason: "duplicate" };
  if (code !== 1) return { allowed: false, reason: "unavailable" };

  return {
    allowed: true,
    async complete() {
      // Set duplicate suppression for 10 minutes only after DB insert success.
      return (await redisEval(
        cfg, COMMIT_LUA, [duplicateKey], [reservationToken, 600]
      )) === 1;
    },
    async release() {
      // A failed DB write must allow retry, but never delete another writer's
      // newer reservation. Counters still count attempted submissions.
      await redisEval(cfg, RELEASE_LUA, [duplicateKey], [reservationToken]);
    },
  };
}
