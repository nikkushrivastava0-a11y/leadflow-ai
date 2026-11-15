// Built-app failure checks with fake credentials. No database/provider requests.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';

for (const [port, overrides, expected] of [
  [3114, { LEADFLOW_EMAIL_ENABLED: 'true', LEADFLOW_EMAIL_MODE: 'sandbox', RESEND_API_KEY: 'PRIVATE_STARTUP_SENTINEL' }, 'RESEND_FROM_EMAIL:missing'],
  [3115, { VERCEL_ENV: 'preview', LEADFLOW_SYNTHETIC_ONLY: 'YES' }, 'LEADFLOW_SYNTHETIC_ONLY:unsafe_target'],
]) {
  const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', String(port)], {
    env: {
      PATH: process.env.PATH, NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1',
      LEADFLOW_ENV: 'staging', LEADFLOW_STAGING_PROJECT_REF: 'example',
      NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'public-fixture',
      ...overrides,
    }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  child.stdout.on('data', data => { output += data; });
  child.stderr.on('data', data => { output += data; });
  try {
    // Next may keep its HTTP listener open after an instrumentation failure.
    // Verify that app handlers stay unavailable, rather than assuming exit=1.
    for (let i=0; i<100 && !output.includes('Invalid LeadFlow environment; startup refused.'); i++) {
      if (child.exitCode !== null) break;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.ok(output.includes('Invalid LeadFlow environment; startup refused.'), 'Startup must refuse configuration, not fail for an unrelated reason');
    assert.ok(output.includes(expected), 'Expected sanitized configuration issue');
    if (child.exitCode !== null) assert.equal(child.exitCode, 1);
    else {
      const response=await fetch(`http://127.0.0.1:${port}/api/health`,{redirect:'manual',signal:AbortSignal.timeout(5000)});
      assert.ok(response.status>=500,'Invalid staging must never serve its health handler as configured');
      const body=await response.text();
      assert.ok(!body.includes('PRIVATE_STARTUP_SENTINEL'),'Responses must not contain credentials');
    }
    assert.ok(!output.includes('PRIVATE_STARTUP_SENTINEL'), 'Logs must not contain credentials');
    console.log(`PASS built staging startup refuses ${expected}; secret values suppressed`);
  } finally {
    if (child.exitCode === null) child.kill('SIGKILL');
    await new Promise(resolve=>{if(child.exitCode!==null||child.signalCode!==null)resolve();else child.once('exit',resolve);});
  }
}
