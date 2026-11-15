// Configuration-only. Never creates a client or probes a database/provider.
import { validateServerEnv } from '../src/lib/server-env.ts';

export function stagingPreflight(env) {
  const issues = validateServerEnv({ ...env, LEADFLOW_ENV: 'staging' });
  if (env.VERCEL_ENV === 'production' || (env.LEADFLOW_ENV && env.LEADFLOW_ENV !== 'staging')) {
    issues.push({ name: 'LEADFLOW_ENV', code: 'unsafe_target' });
  }
  return {
    status: issues.length ? 'not_ready' : 'configured',
    checks: { environment: issues.length === 0, database: 'not_probed', providers: 'not_probed' },
    issues,
  };
}

import { pathToFileURL } from 'node:url';
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = stagingPreflight(process.env);
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.issues.length ? 1 : 0;
}
