import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { releasePreflight } from '../scripts/release-preflight.mjs';
import { mustRefuseStartup } from '../src/lib/server-env.ts';
const base={VERCEL_ENV:'production',LEADFLOW_ENV:'production',NEXT_PUBLIC_SUPABASE_URL:'https://example.supabase.co',NEXT_PUBLIC_SUPABASE_ANON_KEY:'sb_publishable_'+'a'.repeat(32),AUTH_CALLBACK_ORIGIN:'https://pilot.example.test'};
test('production rejects every missing or invalid enabled integration',()=>{
 assert.equal(releasePreflight(base).status,'configured');
 for(const overrides of [{NEXT_PUBLIC_SUPABASE_URL:''},{NEXT_PUBLIC_SUPABASE_ANON_KEY:'placeholder'},{AUTH_CALLBACK_ORIGIN:'http://localhost'},{LEADFLOW_ENV:'staging'},{PUBLIC_ENQUIRIES_ENABLED:'true'},{LEADFLOW_AUTOMATION_ENABLED:'true'},{LEADFLOW_EMAIL_ENABLED:'true'},{LEADFLOW_BILLING_MODE:'razorpay-live'},{LEADFLOW_BILLING_MODE:'razorpay-test'},{LEADFLOW_SYNTHETIC_ONLY:'YES'}]){
  const env={...base,...overrides};const report=releasePreflight(env);
  assert.equal(report.status,'not_ready',JSON.stringify(overrides));
  assert.equal(mustRefuseStartup(env,report.issues),true);
 }
});
test('CLI exits nonzero and prints names only; no secret values',()=>{
 const secret='PRIVATE_RELEASE_SENTINEL';
 const child=spawnSync(process.execPath,['scripts/release-preflight.mjs'],{encoding:'utf8',env:{PATH:process.env.PATH,...base,LEADFLOW_EMAIL_ENABLED:'true',RESEND_API_KEY:secret}});
 assert.equal(child.status,1);assert.ok(!`${child.stdout}${child.stderr}`.includes(secret));
 assert.ok(JSON.parse(child.stdout).issues.some(i=>i.name==='RESEND_FROM_EMAIL'));
});
