import assert from "node:assert/strict";
import test from "node:test";
import { reservePublicLeadSubmission } from "../src/lib/server/public-lead-guard.ts";
const input = {slug:"synthetic-a",name:"Synthetic Person",email:"private@example.test",phone:"+91 98765 43210",honeypot:null};
const keys=["LEAD_GUARD_PROVIDER","LEAD_GUARD_HASH_SECRET","SUPABASE_SECRET_KEY","NEXT_PUBLIC_SUPABASE_URL"];
async function fixture(run:()=>Promise<void>) {
 const previous=keys.map(k=>process.env[k]);const oldFetch=globalThis.fetch;
 Object.assign(process.env,{LEAD_GUARD_PROVIDER:"postgres",LEAD_GUARD_HASH_SECRET:"synthetic-only-pepper-at-least-32-characters",SUPABASE_SECRET_KEY:"sb_secret_synthetic_only_never_live_012345",NEXT_PUBLIC_SUPABASE_URL:"https://synthetic.supabase.co"});
 try{await run();}finally{globalThis.fetch=oldFetch;keys.forEach((k,i)=>{if(previous[i]===undefined)delete process.env[k];else process.env[k]=previous[i];});}
}
test("existing Postgres RPC uses private hashes and token-owned reserve/complete/release",async()=>fixture(async()=>{
 const calls:Array<Record<string,unknown>>=[];
 globalThis.fetch=async(url,init)=>{assert.match(String(url),/\/rest\/v1\/rpc\/leadflow_enquiry_guard$/);calls.push(JSON.parse(String(init?.body)));return new Response("1",{headers:{"Content-Type":"application/json"}});};
 const r=await reservePublicLeadSubmission(input);assert.equal(r.allowed,true);if(!r.allowed)return;
 assert.equal(await r.complete(),true);await r.release();
 assert.deepEqual(calls.map(c=>c.p_operation),["reserve","complete","release"]);
 assert.equal(calls[0].p_token,calls[1].p_token);assert.equal(calls[0].p_token,calls[2].p_token);
 assert.equal(calls[0].p_duplicate_key,calls[1].p_duplicate_key);
 const payload=JSON.stringify(calls);for(const pii of [input.name,input.email,input.phone])assert.ok(!payload.includes(pii));
}));
test("Postgres rate, duplicate, invalid provider and RPC failures fail closed",async()=>fixture(async()=>{
 for(const [response,reason] of [[new Response("2"),"rate_limited"],[new Response("3"),"duplicate"],[new Response("4"),"unavailable"],[new Response('{"message":"error"}',{status:500}),"unavailable"]] as const){
  globalThis.fetch=async()=>response;assert.deepEqual(await reservePublicLeadSubmission(input),{allowed:false,reason});
 }
 process.env.LEAD_GUARD_PROVIDER="unknown";globalThis.fetch=async()=>{throw Error("No provider call allowed")};
 assert.deepEqual(await reservePublicLeadSubmission(input),{allowed:false,reason:"unavailable"});
}));
test("Postgres provider cannot use browser key, local HTTP or missing hashing secret",async()=>fixture(async()=>{
 globalThis.fetch=async()=>{throw Error("Must not send invalid configuration")};
 delete process.env.LEAD_GUARD_HASH_SECRET;assert.equal((await reservePublicLeadSubmission(input)).allowed,false);
 process.env.LEAD_GUARD_HASH_SECRET="synthetic-only-secret-longer-than32characters";process.env.SUPABASE_SECRET_KEY="sb_publishable_synthetic";
 assert.equal((await reservePublicLeadSubmission(input)).allowed,false);
 process.env.SUPABASE_SECRET_KEY="sb_secret_synthetic_only_never_live_012345";process.env.NEXT_PUBLIC_SUPABASE_URL="http://localhost:54321";
 assert.equal((await reservePublicLeadSubmission(input)).allowed,false);
}));
