// Starts the built app with fake credentials. No live Auth, AI, Redis or payments.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";

const port = 3113;
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)], {
  env: {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "dummy-build-only-key",
    NEXT_TELEMETRY_DISABLED: "1",
    PUBLIC_ENQUIRIES_ENABLED: "false",
    SUPABASE_SECRET_KEY: "",
    GEMINI_API_KEY: "",
    UPSTASH_REDIS_REST_URL: "",
    UPSTASH_REDIS_REST_TOKEN: "",
    LEAD_GUARD_HASH_SECRET: "",
  },
  stdio: ["ignore", "pipe", "pipe"],
});
let output = "";
server.stdout.on("data", data => { output += data; });
server.stderr.on("data", data => { output += data; });
const base = `http://127.0.0.1:${port}`;
try {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null) throw new Error(`App exited before smoke checks: ${output}`);
    try { await fetch(base, { signal: AbortSignal.timeout(1000) }); break; }
    catch {
      if (attempt === 99) throw new Error(`App startup timeout: ${output}`);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  for (const [path, status, expected] of [
    ["/", 200, "LeadFlow AI"],
    ["/login", 200, "Welcome back"],
    ["/dashboard", 307, null],
    ["/form", 307, null],
    ["/form/synthetic-business", 200, "Enquiry form unavailable"],
    ["/form/Bad_Slug", 404, null],
    ["/form/synthetic-business?success=true", 200, "Submission status unavailable"],
    ["/auth/callback", 303, null],
    ["/auth/auth-code-error", 200, null],
  ]) {
    const response = await fetch(base + path, { redirect: "manual", signal: AbortSignal.timeout(5000) });
    assert.equal(response.status, status, path);
    const body = await response.text();
    if (expected) assert.ok(body.includes(expected), `${path}: missing expected state`);
    if (path === "/dashboard") assert.equal(new URL(response.headers.get("location"), base).pathname, "/login");
    if (path === "/form") assert.equal(new URL(response.headers.get("location"), base).pathname, "/");
    if (path === "/auth/callback") {
      assert.equal(new URL(response.headers.get("location"), base).pathname, "/auth/auth-code-error");
      assert.equal(response.headers.get("cache-control"), "no-store");
    }
    console.log(`PASS HTTP ${status} ${path}`);
  }
  const response = await fetch(base + "/api/checkout", { method: "POST", signal: AbortSignal.timeout(5000) });
  assert.equal(response.status, 503);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), { error: "Paid upgrades are not available yet." });
  console.log("PASS HTTP 503 checkout remains disabled");
  for (const action of ["checkout", "verify", "webhook"]) {
    const result = await fetch(base + "/api/billing/" + action, { method: "POST", signal: AbortSignal.timeout(5000) });
    assert.equal(result.status, 503);
    assert.equal(result.headers.get("cache-control"), "no-store");
    console.log(`PASS HTTP 503 test billing ${action} remains disabled`);
  }
} finally {
  server.kill("SIGTERM");
}
