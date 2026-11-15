import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
const root=new URL('../src/lib/',import.meta.url);
const key=Symbol.for('leadflow.automation.test');
const hook=registerHooks({resolve(specifier,context,next){
 if(specifier==='server-only')return {url:'data:text/javascript,export{}',shortCircuit:true};
 if(specifier==='@/lib/server/public-submission-client')return {url:'data:text/javascript,export function createPublicSubmissionClient(){return globalThis[Symbol.for("leadflow.automation.test")].db}',shortCircuit:true};
 if(specifier.startsWith('@/lib/'))return {url:new URL(specifier.slice(6)+'.ts',root).href,shortCircuit:true};
 return next(specifier,context);
}});
const {runAutomation,cronAuthorized,processJob}=await import('../src/lib/server/automation/runtime.ts');
const {sendJobEmail}=await import('../src/lib/server/automation/email.ts');
hook.deregister();
const secret='synthetic-cron-secret-32-characters-long';
function fixture(){
 const state={calls:[],emails:[],job:null,snapshot:null,lead:{email:'customer@example.test',phone:'9999999999',source:'website',notes:'Private notes',status:'new',created_at:new Date().toISOString()},settings:null};
 state.db={auth:{admin:{getUserById:async()=>({data:{user:{email:'owner@example.test',email_confirmed_at:'2026-01-01'}}})}},rpc:async(name,args)=>{
  state.calls.push({name,args});
  if(name==='automation_claim')return {data:state.job?[state.job]:[],error:null};
  if(name==='automation_prepare_email'){state.snapshot??={message:args.p_message,created_at:new Date().toISOString(),provider_id:null};return {data:state.snapshot,error:null};}
  return {data:null,error:null};
 },from(table){let patch;
  const q={select(){return q;},eq(){return q;},gt(){return q;},update(v){patch=v;return q;},async maybeSingle(){
   if(table==='automation_jobs')return {data:state.noLease?null:{id:'synthetic-job'},error:null};
   if(table==='email_deliveries')return {data:state.snapshot,error:null};
   if(table==='leads')return {data:state.lead,error:state.leadError?{code:'synthetic'}:null};
   if(table==='automation_settings')return {data:state.settings,error:null};
   if(table==='clients')return {data:{owner_user_id:'owner',business_name:'Synthetic'},error:null};
   throw new Error('Unexpected table '+table);
  },then(resolve,reject){if(patch&&table==='email_deliveries')Object.assign(state.snapshot,patch);return Promise.resolve({error:null}).then(resolve,reject);}};return q;
 }};globalThis[key]=state;return state;
}
const job={id:'synthetic-job',token:'synthetic-token',kind:'qualification',lead_id:'synthetic-lead',client_slug:'synthetic-a',payload:{},attempts:1};
async function configured(fn){
 const names=['CRON_SECRET','LEADFLOW_AUTOMATION_ENABLED','LEADFLOW_EMAIL_ENABLED','GEMINI_API_KEY','GEMINI_MODEL','RESEND_API_KEY'];
 const prior=Object.fromEntries(names.map(k=>[k,process.env[k]]));
 Object.assign(process.env,{CRON_SECRET:secret,LEADFLOW_AUTOMATION_ENABLED:'true',LEADFLOW_EMAIL_ENABLED:'false',RESEND_API_KEY:'synthetic-key'});delete process.env.GEMINI_API_KEY;delete process.env.GEMINI_MODEL;
 try{return await fn();}finally{for(const k of names)if(prior[k]===undefined)delete process.env[k];else process.env[k]=prior[k];}
}
test('cron rejects absent/invalid secrets and checks authorization before database access',async()=>{
 assert.equal(cronAuthorized('Bearer '+secret,secret),true);assert.equal(cronAuthorized('Bearer wrong',secret),false);assert.equal(cronAuthorized(null,secret),false);assert.equal(cronAuthorized('Bearer short','short'),false);
 await configured(async()=>{const s=fixture();const response=await runAutomation(new Request('https://example.test/api/cron/automation'));assert.equal(response.status,401);assert.equal(s.calls.length,0);
 process.env.LEADFLOW_AUTOMATION_ENABLED='false';const disabled=await runAutomation(new Request('https://example.test/api/cron/automation',{headers:{authorization:'Bearer '+secret}}));assert.deepEqual(await disabled.json(),{enabled:false});assert.equal(s.calls.length,0);});
});
test('actual worker commits qualification fallback and persists retry on database failure',async()=>{
 await configured(async()=>{const s=fixture();s.job=job;
 const request=()=>new Request('https://example.test/api/cron/automation',{headers:{authorization:'Bearer '+secret}});
 assert.deepEqual(await (await runAutomation(request())).json(),{completed:1,failed:0});
 const finish=s.calls.find(c=>c.name==='automation_finish');assert.equal(finish.args.p_token,job.token);assert.equal(finish.args.p_result.failure,'not_configured');assert.equal(finish.args.p_result.engine,'rules');
 s.calls=[];s.leadError=true;assert.deepEqual(await(await runAutomation(request())).json(),{completed:0,failed:1});assert.equal(s.calls.find(c=>c.name==='automation_fail').args.p_token,job.token);
 });
});
test('actual outbox retries reuse saved message and skip acknowledged or expired attempts',async()=>{
 await configured(async()=>{const s=fixture();let sent=0;const priorFetch=globalThis.fetch;
 globalThis.fetch=async(_url,init)=>{sent++;assert.equal(init.headers['Idempotency-Key'],'leadflow/synthetic-job');return Response.json({id:'synthetic-receipt'});};
 try{
 const emailJob={...job,kind:'customer_confirmation'};
 const build=async()=>({from:'sender@example.test',to:'customer@example.test',subject:'Confirmation',text:'Received.'});
 assert.equal((await sendJobEmail(s.db,emailJob,build)).delivery,'sent');
 assert.equal((await sendJobEmail(s.db,emailJob,async()=>{throw new Error('Must reuse');})).delivery,'already_sent');assert.equal(sent,1);
 s.snapshot.provider_id=null;s.snapshot.created_at=new Date(Date.now()-21*3600000).toISOString();
 assert.equal((await sendJobEmail(s.db,emailJob,build)).delivery,'needs_review');assert.equal(sent,1);
 }finally{globalThis.fetch=priorFetch;}
 });
});
test('actual follow-up processor cancels contacted leads and respects weekly opt-out',async()=>{
 const s=fixture();s.lead.status='contacted';assert.equal((await processJob(s.db,{...job,kind:'followup',payload:{stage:24}})).skipped,true);
 assert.equal(s.calls.some(c=>c.name==='automation_prepare_email'),false);
 s.settings={weekly_report_enabled:false};assert.equal((await processJob(s.db,{...job,kind:'weekly_report'})).skipped,true);
});

test('owner mapping change cancels a prepared email instead of resending to former owner',async()=>{
 await configured(async()=>{const s=fixture();s.snapshot={message:{from:'sender@example.test',to:'former@example.test',subject:'Report',text:'Old snapshot'},created_at:new Date().toISOString(),provider_id:null};
 const prior=globalThis.fetch;globalThis.fetch=async()=>{throw new Error('No email should be sent');};
 try{assert.equal((await sendJobEmail(s.db,{...job,kind:'owner_alert'},async()=>{throw new Error('Reuse snapshot');})).delivery,'recipient_changed');}finally{globalThis.fetch=prior;}
 });
});

test('outbox cannot deliver without a fresh token-owned lease',async()=>{
 await configured(async()=>{const s=fixture();s.noLease=true;await assert.rejects(sendJobEmail(s.db,{...job,kind:'customer_confirmation'},async()=>({from:'sender@example.test',to:'customer@example.test',subject:'Test',text:'Test'})),/lease/);});
});
