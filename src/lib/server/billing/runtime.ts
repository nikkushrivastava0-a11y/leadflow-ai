import "server-only";
import { createClient } from "@supabase/supabase-js";
import { resolveOwnerScope } from "@/lib/server/owner-scope";
import { BillingError, readBillingConfig, checkout, verify, webhook, type LedgerOrder, type Store } from "./core.ts";
import { createRazorpayTestProvider } from "./razorpay-test.ts";

function runtime() {
  const config = readBillingConfig(process.env);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!config || !url || !key || !(key.startsWith("sb_secret_") && key.length >= 24)) throw new BillingError("Test billing is unavailable.",503);
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" || !parsed.hostname.endsWith(".supabase.co") || parsed.username || parsed.password || parsed.pathname !== "/" || parsed.search || parsed.hash) throw new BillingError("Test billing configuration unavailable.",503);
  const db = createClient(parsed.origin,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  const store: Store = {
    async reserveAttempt(owner, receipt) {
      const {error}=await db.rpc("billing_test_reserve_attempt",{p_id:receipt,p_owner:owner.userId,p_slug:owner.slug}).abortSignal(AbortSignal.timeout(4000));
      if(error) throw new BillingError("Test checkout limit reached or unavailable. Try later.",429);
    },
    async createOrder(order) {
      const { error } = await db.rpc("billing_test_create_order",{p_id:order.id,p_owner:order.userId,p_slug:order.slug,p_provider_order:order.providerOrderId,p_plan:order.plan,p_amount:order.amount,p_currency:order.currency,p_duration:order.durationDays}).abortSignal(AbortSignal.timeout(4000));
      if(error) throw new BillingError("Test order could not be saved. Do not retry payment.",503);
    },
    async getOrder(id) {
      if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
      const {data,error}=await db.from("billing_test_orders").select("id,owner_user_id,client_slug,provider_order_id,plan,amount,currency,duration_days").eq("id",id).abortSignal(AbortSignal.timeout(4000)).maybeSingle();
      if(error) throw new BillingError("Test order unavailable.",503);
      if(!data) return null;
      return {id:data.id,userId:data.owner_user_id,slug:data.client_slug,providerOrderId:data.provider_order_id,plan:data.plan,amount:Number(data.amount),currency:data.currency,durationDays:data.duration_days} as LedgerOrder;
    },
    async process(input) {
      const {data,error}=await db.rpc("billing_test_process_event",{p_event:input.eventId,p_hash:input.bodyHash,p_provider_order:input.orderId,p_payment:input.paymentId,p_amount:input.amount,p_currency:input.currency,p_state:input.state}).abortSignal(AbortSignal.timeout(4000));
      if(error || !["applied","duplicate","revoked"].includes(data)) throw new BillingError("Test payment processing unavailable; retry the same event.",503);
      return data;
    },
  };
  return {config,store,provider:createRazorpayTestProvider(config)};
}
const MAX_BODY = 65536;
async function limitedBody(request: Request) {
  if(Number(request.headers.get("content-length"))>MAX_BODY) throw new BillingError("Request too large.",413);
  const reader=request.body?.getReader(); const chunks: Uint8Array[]=[]; let size=0;
  if(reader) { try { while(true) { const {done,value}=await reader.read(); if(done) break; size+=value.byteLength; if(size>MAX_BODY) { await reader.cancel(); throw new BillingError("Request too large.",413); } chunks.push(value); } } finally { reader.releaseLock(); } }
  return Buffer.concat(chunks);
}
export async function handleBilling(request: Request, action: "checkout" | "verify" | "webhook") {
  const headers={"Cache-Control":"no-store"};
  try {
    // All configuration gates are checked before reading body/auth/provider operations.
    const {config,provider,store}=runtime();
    const raw=await limitedBody(request);
    if(action==="webhook") return Response.json(await webhook(raw,request.headers.get("x-razorpay-signature"),request.headers.get("x-razorpay-event-id"),config,provider,store),{headers});
    // Reject cross-origin cookie-auth mutations even when browser sends cookies.
    const origin=request.headers.get("origin");
    if(!origin || origin!==new URL(request.url).origin) throw new BillingError("Same-origin request required.",403);
    const scope=await resolveOwnerScope();
    const owner=scope.ok?{userId:scope.userId,slug:scope.slug}:null;
    let body:unknown; try{body=JSON.parse(raw.toString("utf8"));}catch{throw new BillingError("Invalid request JSON.");}
    const result=action==="checkout"?await checkout(owner,body,config,provider,store):await verify(owner,body,config,provider,store);
    return Response.json(result,{headers});
  } catch(error) {
    return Response.json({error:error instanceof BillingError?error.message:"Test billing is unavailable."},{status:error instanceof BillingError?error.status:503,headers});
  }
}
