import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { stagingPreflight } from '../scripts/staging-preflight.mjs';

const configured={NEXT_PUBLIC_SUPABASE_URL:'https://synthetic.supabase.co',NEXT_PUBLIC_SUPABASE_ANON_KEY:'public-fixture',LEADFLOW_STAGING_PROJECT_REF:'synthetic'};
test('preflight forces staging checks even when the environment label is absent',()=>{
 const report=stagingPreflight({...configured,NEXT_PUBLIC_SUPABASE_URL:'https://pqzawjeggyxarwdkdynz.supabase.co'});
 assert.equal(report.status,'not_ready');
 assert.ok(report.issues.some(i=>i.code==='unsafe_target'));
 assert.equal(stagingPreflight({...configured,VERCEL_ENV:'production'}).status,'not_ready');
 assert.equal(stagingPreflight({...configured,LEADFLOW_ENV:'production'}).status,'not_ready');
});
test('preflight CLI fails incomplete setup without disclosing values or contacting providers',()=>{
 const secret='PRIVATE_PREFLIGHT_SENTINEL';
 const child=spawnSync(process.execPath,['scripts/staging-preflight.mjs'],{encoding:'utf8',env:{PATH:process.env.PATH,...configured,LEADFLOW_EMAIL_ENABLED:'true',RESEND_API_KEY:secret}});
 assert.equal(child.status,1);
 assert.ok(!`${child.stdout}${child.stderr}`.includes(secret));
 const report=JSON.parse(child.stdout);
 assert.ok(report.issues.some(i=>i.name==='RESEND_FROM_EMAIL'));
 assert.deepEqual(report.checks,{environment:false,database:'not_probed',providers:'not_probed'});
 const ready=spawnSync(process.execPath,['scripts/staging-preflight.mjs'],{encoding:'utf8',env:{PATH:process.env.PATH,...configured}});
 assert.equal(ready.status,0);assert.equal(JSON.parse(ready.stdout).status,'configured');
});
