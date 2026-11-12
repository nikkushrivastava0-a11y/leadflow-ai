import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { checkout, verify, webhook, readBillingConfig, signatureValid, type BillingConfig, type LedgerOrder, type Store, type ProviderPayment, type Provider } from "../src/lib/server/billing/core.ts";
import { createRazorpayTestProvider } from "../src/lib/server/billing/razorpay-test.ts";
const env={LEADFLOW_BILLING_MODE:"razorpay-test",RAZORPAY_KEY_ID:"rzp_test_synthetic",RAZORPAY_KEY_SECRET:"synthetic-test-secret-0123456789",RAZORPAY_WEBHOOK_SECRET:"synthetic-webhook-secret-0123456789",LEADFLOW_TEST_PLAN_CATALOGUE:JSON.stringify({pilot:{amount:12345,currency:"INR",durationDays:30}})};
const config=readBillingConfig(env) as BillingConfig;
const owner={userId:"11111111-1111-1111-1111-111111111111",slug:"synthetic-a"};
function setup(){
 const orders=new Map<string,LedgerOrder>(); const calls:string[]=[];
 let payment:ProviderPayment={id:"pay_synthetic",order_id:"order_synthetic",amount:12345,currency:"INR",status:"captured",captured:true,amount_refunded:0};
 const store:Store={async reserveAttempt(){calls.push("reserve");},async createOrder(o){orders.set(o.id,o);},async getOrder(id){return orders.get(id)||null;},async process(){calls.push("process");return "applied";}};
 const provider:Provider={async createOrder(i){calls.push("provider-order");return {...i,id:"order_synthetic"};},async fetchPayment(){calls.push("provider-fetch");return payment;}};
 return {orders,calls,store,provider,setPayment(p:Partial<ProviderPayment>){payment={...payment,...p};}};
}
const sign=(s:string|Buffer,secret:string)=>createHmac("sha256",secret).update(s).digest("hex");
test("billing requires explicit mode, test key, strong secrets and server catalogue",()=>{
 assert.ok(config);
 for(const patch of [{LEADFLOW_BILLING_MODE:undefined},{RAZORPAY_KEY_ID:"rzp_live_synthetic"},{RAZORPAY_KEY_SECRET:"short"},{RAZORPAY_WEBHOOK_SECRET:"short"},{LEADFLOW_TEST_PLAN_CATALOGUE:"{}"},{LEADFLOW_TEST_PLAN_CATALOGUE:JSON.stringify({pilot:{amount:0,currency:"INR",durationDays:30}})},{LEADFLOW_TEST_PLAN_CATALOGUE:JSON.stringify({pilot:{amount:12345,currency:"USD",durationDays:30}})}]) assert.equal(readBillingConfig({...env,...patch}),null);
});
test("checkout requires owner and ignores no client pricing claims",async()=>{
 const s=setup();
 await assert.rejects(checkout(null,{plan:"pilot"},config,s.provider,s.store),/Sign in/);
 await assert.rejects(checkout(owner,{plan:"pilot",amount:1},config,s.provider,s.store),/configured test plan/);
 await assert.rejects(checkout(owner,{plan:"unknown"},config,s.provider,s.store),/configured test plan/);
 assert.deepEqual(s.calls,[]);
 const result=await checkout(owner,{plan:"pilot"},config,s.provider,s.store);
 assert.equal(result.amount,12345); assert.equal(result.mode,"test");
 assert.equal(s.orders.get(result.ledgerOrderId)?.userId,owner.userId);
 assert.equal(s.orders.get(result.ledgerOrderId)?.providerOrderId,"order_synthetic");
});
test("checkout rejects mismatching provider order before durable return",async()=>{
 const s=setup(); s.provider.createOrder=async(i)=>({...i,id:"order_synthetic",amount:1});
 await assert.rejects(checkout(owner,{plan:"pilot"},config,s.provider,s.store),/invalid order/); assert.equal(s.orders.size,0);
});
test("verify checks stored owner and stored order signature before fetching provider",async()=>{
 const s=setup(); const result=await checkout(owner,{plan:"pilot"},config,s.provider,s.store); s.calls.length=0;
 const body={ledgerOrderId:result.ledgerOrderId,paymentId:"pay_synthetic",signature:sign("order_synthetic|pay_synthetic",config.keySecret)};
 await assert.rejects(verify({...owner,userId:"other"},body,config,s.provider,s.store),/Order unavailable/);
 await assert.rejects(verify(owner,{...body,signature:sign("order_attacker|pay_synthetic",config.keySecret)},config,s.provider,s.store),/Invalid payment signature/);
 assert.deepEqual(s.calls,[]);
 assert.deepEqual(await verify(owner,body,config,s.provider,s.store),{mode:"test",status:"applied"});
 assert.deepEqual(s.calls,["provider-fetch","process"]);
});
test("capture must match order amount currency payment ID and refund-free captured status",async()=>{
 for(const patch of [{id:"pay_other"},{order_id:"order_other"},{amount:1},{currency:"USD"},{status:"authorized",captured:false},{amount_refunded:1},{amount_refunded:-1}]) {
  const s=setup(); const result=await checkout(owner,{plan:"pilot"},config,s.provider,s.store); s.calls.length=0;s.setPayment(patch);
  await assert.rejects(verify(owner,{ledgerOrderId:result.ledgerOrderId,paymentId:"pay_synthetic",signature:sign("order_synthetic|pay_synthetic",config.keySecret)},config,s.provider,s.store));
  assert.equal(s.calls.includes("process"),false);
 }
});
test("webhook HMAC uses raw bytes and separate webhook secret before provider fetch",async()=>{
 const s=setup(); const raw=Buffer.from('{ "event":"payment.captured", "payload":{"payment":{"entity":{"id":"pay_synthetic"}}}}');
 await assert.rejects(webhook(raw,sign(raw,config.keySecret),"evt_a",config,s.provider,s.store),/signature/);
 const altered=Buffer.from(JSON.stringify(JSON.parse(raw.toString())));
 await assert.rejects(webhook(altered,sign(raw,config.webhookSecret),"evt_a",config,s.provider,s.store),/signature/);
 await assert.rejects(webhook(raw,sign(raw,config.webhookSecret),null,config,s.provider,s.store),/event ID/);
 assert.deepEqual(s.calls,[]);
 assert.deepEqual(await webhook(raw,sign(raw,config.webhookSecret),"evt_a",config,s.provider,s.store),{mode:"test",status:"applied"});
});
test("out-of-order authorized event is ignored and confirmed partial refunds revoke",async()=>{
 const s=setup(); const authorized=Buffer.from(JSON.stringify({event:"payment.authorized"}));
 assert.equal((await webhook(authorized,sign(authorized,config.webhookSecret),"evt_authorized",config,s.provider,s.store)).status,"ignored");
 assert.deepEqual(s.calls,[]);
 let applied:unknown; s.store.process=async(input)=>{applied=input;return "revoked";};s.setPayment({amount_refunded:1});
 const raw=Buffer.from(JSON.stringify({event:"refund.processed",payload:{refund:{entity:{payment_id:"pay_synthetic"}}}}));
 assert.equal((await webhook(raw,sign(raw,config.webhookSecret),"evt_refund",config,s.provider,s.store)).status,"revoked");
 assert.equal((applied as {state:string}).state,"revoked");
});
test("malformed signatures and webhook payloads fail closed",async()=>{
 assert.equal(signatureValid("a","00",config.keySecret),false);assert.equal(signatureValid("a","z".repeat(64),config.keySecret),false);
 const s=setup();for(const raw of [Buffer.from("{"),Buffer.from('{}'),Buffer.from('{"event":"payment.captured"}')]) await assert.rejects(webhook(raw,sign(raw,config.webhookSecret),"evt_bad",config,s.provider,s.store));
 assert.deepEqual(s.calls,[]);
});
test("provider transport uses only official API test credentials; no capture/refund calls",async()=>{
 const calls:{url:string;options:RequestInit}[]=[];
 const fakeFetch:typeof fetch=async(url,options)=>{calls.push({url:String(url),options:options!});return Response.json(String(url).endsWith("/orders")?{id:"order_synthetic",amount:12345,currency:"INR",receipt:"receipt"}:{id:"pay_synthetic"});};
 const provider=createRazorpayTestProvider(config,fakeFetch);
 await provider.createOrder({amount:12345,currency:"INR",receipt:"receipt"});await provider.fetchPayment("pay_synthetic");
 assert.deepEqual(calls.map(c=>c.url),["https://api.razorpay.com/v1/orders","https://api.razorpay.com/v1/payments/pay_synthetic"]);
 assert.equal(calls[0].options.method,"POST");assert.equal(calls[1].options.method,"GET");
 assert.equal(JSON.parse(String(calls[0].options.body)).partial_payment,false);
 assert.throws(()=>createRazorpayTestProvider({...config,keyId:"rzp_live_synthetic"},fakeFetch),/test keys/);
 await assert.rejects(provider.fetchPayment("../../secrets"));
});
test("provider failures and ledger failures never report a paid state",async()=>{
 const s=setup();s.store.createOrder=async()=>{throw new Error("synthetic database down");};
 await assert.rejects(checkout(owner,{plan:"pilot"},config,s.provider,s.store),/database down/);
 const provider=createRazorpayTestProvider(config,async()=>new Response("provider failure",{status:500}));
 await assert.rejects(provider.fetchPayment("pay_synthetic"),/unavailable/);
});

test("signed dispute events revoke and won/closed events never regrant",async()=>{
 const s=setup();let state; s.store.process=async(input)=>{state=input.state;return "revoked";};
 const raw=Buffer.from(JSON.stringify({event:"payment.dispute.created",payload:{dispute:{entity:{payment_id:"pay_synthetic"}}}}));
 assert.equal((await webhook(raw,sign(raw,config.webhookSecret),"evt_dispute",config,s.provider,s.store)).status,"revoked");assert.equal(state,"revoked");
 for(const event of ["payment.dispute.won","payment.dispute.closed"]) {const raw=Buffer.from(JSON.stringify({event}));assert.equal((await webhook(raw,sign(raw,config.webhookSecret),"evt_closed",config,s.provider,s.store)).status,"ignored");}
});

test("atomic checkout reservation failure prevents any provider order",async()=>{const s=setup();s.store.reserveAttempt=async()=>{throw new Error("synthetic shared rate limit");};await assert.rejects(checkout(owner,{plan:"pilot"},config,s.provider,s.store),/rate limit/);assert.deepEqual(s.calls,[]);});

// Provider JSON is untrusted at runtime even when its TypeScript type is boolean.
test("truthy non-boolean captured fields cannot grant test access",async()=>{
 for(const captured of ["true",1]){
  const s=setup();const order=await checkout(owner,{plan:"pilot"},config,s.provider,s.store);
  s.setPayment({captured:captured as unknown as boolean});s.calls.length=0;
  await assert.rejects(verify(owner,{ledgerOrderId:order.ledgerOrderId,paymentId:"pay_synthetic",signature:sign("order_synthetic|pay_synthetic",config.keySecret)},config,s.provider,s.store),/captured/);
  const raw=Buffer.from(JSON.stringify({event:"payment.captured",payload:{payment:{entity:{id:"pay_synthetic"}}}}));
  await assert.rejects(webhook(raw,sign(raw,config.webhookSecret),"evt_truthy",config,s.provider,s.store),/capture/);
  assert.equal(s.calls.includes("process"),false);
 }
});
