import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
const require=createRequire(import.meta.url);
function compile(relative){return ts.transpileModule(readFileSync(new URL(relative,import.meta.url),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;}
const coreModule={exports:{}};
vm.runInNewContext(compile("../src/lib/server/billing/core.ts"),{module:coreModule,exports:coreModule.exports,require,Buffer,URL});
function load(env={}){
 const calls=[];const routeModule={exports:{}};
 vm.runInNewContext(compile("../src/lib/server/billing/runtime.ts"),{module:routeModule,exports:routeModule.exports,process:{env},Response,Request,URL,Buffer,
  require(name){
   if(name==="server-only") return {};
   if(name==="./core.ts")return coreModule.exports;
   if(name==="@supabase/supabase-js")return {createClient(){calls.push("database");throw new Error("Unexpected database access");}};
   if(name==="@/lib/server/owner-scope")return {async resolveOwnerScope(){calls.push("auth");throw new Error("Unexpected auth access");}};
   if(name==="./razorpay-test.ts")return {createRazorpayTestProvider(){calls.push("provider");throw new Error("Unexpected provider access");}};
   throw new Error(`Unexpected import ${name}`);
  },
 });return {handler:routeModule.exports.handleBilling,calls};
}
for(const action of ["checkout","verify","webhook"]){
 test(`new billing ${action} route stays unavailable by default without touching auth/provider/database`,async()=>{
  const {handler,calls}=load();const request=new Request(`https://example.test/api/billing/${action}`,{method:"POST",body:"{invalid",headers:{origin:"https://example.test"}});
  const result=await handler(request,action);
  assert.equal(result.status,503);assert.equal(result.headers.get("cache-control"),"no-store");assert.deepEqual(await result.json(),{error:"Test billing is unavailable."});assert.deepEqual(calls,[]);
 });
}
test("live keys cannot activate the runtime even with apparent test opt-in",async()=>{
 const {handler,calls}=load({LEADFLOW_BILLING_MODE:"razorpay-test",RAZORPAY_KEY_ID:"rzp_live_synthetic",RAZORPAY_KEY_SECRET:"synthetic-secret-0123456789",RAZORPAY_WEBHOOK_SECRET:"synthetic-webhook-secret-0123456789",LEADFLOW_TEST_PLAN_CATALOGUE:JSON.stringify({pilot:{amount:12345,currency:"INR",durationDays:30}})});
 const result=await handler(new Request("https://example.test/api/billing/checkout",{method:"POST"}),"checkout");
 assert.equal(result.status,503);assert.deepEqual(calls,[]);
});
