type Env=Record<string,string|undefined>;
export type EnvIssue={name:string;code:"missing"|"invalid"|"unsafe_target"};
const PRODUCTION_REF="pqzawjeggyxarwdkdynz";
export function validateServerEnv(env:Env):EnvIssue[]{
 const issues:EnvIssue[]=[];
 const need=(name:string,valid:(v:string)=>boolean=()=>true)=>{const v=env[name];if(!v?.trim())issues.push({name,code:"missing"});else if(!valid(v))issues.push({name,code:"invalid"});};
 need("NEXT_PUBLIC_SUPABASE_URL",v=>{try{const u=new URL(v);return ["https:",...(env.LEADFLOW_SYNTHETIC_ONLY==="YES"?["http:"]:[])].includes(u.protocol)&&!u.username&&!u.password&&u.pathname==="/"&&!u.search&&!u.hash;}catch{return false;}});
 need("NEXT_PUBLIC_SUPABASE_ANON_KEY");
 let ref="";try{ref=new URL(env.NEXT_PUBLIC_SUPABASE_URL||"").hostname.split(".")[0];}catch{}
 if(env.VERCEL_ENV==="preview"||env.LEADFLOW_ENV==="staging"){
  if(ref===PRODUCTION_REF)issues.push({name:"NEXT_PUBLIC_SUPABASE_URL",code:"unsafe_target"});
  if(env.LEADFLOW_SYNTHETIC_ONLY!=="YES"){need("LEADFLOW_STAGING_PROJECT_REF",v=>v!==PRODUCTION_REF&&v===ref);}
 }
 if(env.PUBLIC_ENQUIRIES_ENABLED==="true"||env.LEADFLOW_AUTOMATION_ENABLED==="true"){
  need("SUPABASE_SECRET_KEY",v=>v.startsWith("sb_secret_")&&v.length>=24);
 }
 if(env.PUBLIC_ENQUIRIES_ENABLED==="true"){
  need("LEAD_GUARD_HASH_SECRET",v=>v.length>=32);
  need("LEAD_GUARD_PROVIDER",v=>["postgres","redis"].includes(v));
  if(env.LEAD_GUARD_PROVIDER==="redis"){need("UPSTASH_REDIS_REST_URL");need("UPSTASH_REDIS_REST_TOKEN");}
 }
 if(env.LEADFLOW_AUTOMATION_ENABLED==="true")need("CRON_SECRET",v=>v.length>=32);
 if(env.GEMINI_API_KEY)need("GEMINI_MODEL",v=>/^[a-zA-Z0-9._-]{2,80}$/.test(v));
 if(env.LEADFLOW_EMAIL_ENABLED==="true"){
  need("RESEND_API_KEY");need("RESEND_FROM_EMAIL",v=>/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(v));
  if(env.LEADFLOW_ENV==="staging"||env.VERCEL_ENV==="preview")need("LEADFLOW_EMAIL_MODE",v=>v==="sandbox");
 }
 if(env.LEADFLOW_BILLING_MODE&&!["disabled","razorpay-test"].includes(env.LEADFLOW_BILLING_MODE))issues.push({name:"LEADFLOW_BILLING_MODE",code:"invalid"});
 if(env.LEADFLOW_BILLING_MODE==="razorpay-test"){
  need("RAZORPAY_KEY_ID",v=>/^rzp_test_[A-Za-z0-9]+$/.test(v));need("RAZORPAY_KEY_SECRET",v=>v.length>=16);need("RAZORPAY_WEBHOOK_SECRET",v=>v.length>=24);need("LEADFLOW_TEST_PLAN_CATALOGUE",v=>{try{return Object.keys(JSON.parse(v)).length>0;}catch{return false;}});
 }
 for(const name of Object.keys(env))if(/^NEXT_PUBLIC_.*(SECRET|SERVICE_ROLE|PRIVATE|PASSWORD)/.test(name))issues.push({name,code:"unsafe_target"});
 return issues;
}
