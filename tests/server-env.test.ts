import test from 'node:test';import assert from 'node:assert/strict';import {validateServerEnv} from '../src/lib/server-env.ts';
const base={NEXT_PUBLIC_SUPABASE_URL:'https://synthetic.supabase.co',NEXT_PUBLIC_SUPABASE_ANON_KEY:'public-synthetic'};
test('env validation reports only variable names and codes',()=>{
 const secret='SENSITIVE_SENTINEL_NEVER_LOG';const issues=validateServerEnv({...base,GEMINI_API_KEY:secret,LEADFLOW_AUTOMATION_ENABLED:'true'});
 assert.ok(issues.some(i=>i.name==='CRON_SECRET'));assert.ok(issues.some(i=>i.name==='GEMINI_MODEL'));assert.ok(!JSON.stringify(issues).includes(secret));
});
test('preview and staging reject production database and mismatched staging ref',()=>{
 assert.ok(validateServerEnv({...base,VERCEL_ENV:'preview',NEXT_PUBLIC_SUPABASE_URL:'https://pqzawjeggyxarwdkdynz.supabase.co'}).some(i=>i.code==='unsafe_target'));
 assert.ok(validateServerEnv({...base,LEADFLOW_ENV:'staging',LEADFLOW_STAGING_PROJECT_REF:'wrong'}).length);
 assert.deepEqual(validateServerEnv({...base,LEADFLOW_ENV:'staging',LEADFLOW_STAGING_PROJECT_REF:'synthetic'}),[]);
});
test('default disabled integrations require no provider secrets; live billing and public secrets refused',()=>{
 assert.deepEqual(validateServerEnv(base),[]);assert.ok(validateServerEnv({...base,LEADFLOW_BILLING_MODE:'razorpay-live'}).length);
 assert.ok(validateServerEnv({...base,NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY:'sensitive'}).some(i=>i.code==='unsafe_target'));
});
