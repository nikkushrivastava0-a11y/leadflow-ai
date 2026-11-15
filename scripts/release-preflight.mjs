// Configuration-only: no network, database or provider calls. Never print values.
import { pathToFileURL } from 'node:url';
import { validateServerEnv } from '../src/lib/server-env.ts';
export function releasePreflight(env) {
  const issues = validateServerEnv(env);
  return { status: issues.length ? 'not_ready' : 'configured', issues,
    database: 'not_probed', providers: 'not_probed' };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const report = releasePreflight(process.env);
  console.log(JSON.stringify(report));
  process.exitCode = report.issues.length ? 1 : 0;
}
