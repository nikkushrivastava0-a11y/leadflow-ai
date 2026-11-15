import "server-only";
import { readBillingConfig } from "./core.ts";
import { resolveOwnerScope } from "@/lib/server/owner-scope";
/** Test entitlements never authorize live billing or production paid access. */
export async function testAccess() {
 if(process.env.LEADFLOW_TEST_CHECKOUT_UI!=="true"||!readBillingConfig(process.env))return {active:false as const,reason:"disabled"};
 const scope=await resolveOwnerScope();if(!scope.ok)return {active:false as const,reason:"unauthorized"};
 const {data,error}=await scope.supabase.from("billing_test_entitlements").select("plan,expires_at").eq("owner_user_id",scope.userId).eq("client_slug",scope.slug).eq("mode","test").is("revoked_at",null).gt("expires_at",new Date().toISOString()).order("expires_at",{ascending:false}).limit(1).maybeSingle();
 if(error||!data)return {active:false as const,reason:error?"unavailable":"inactive"};
 return {active:true as const,mode:"test",plan:data.plan as string,expiresAt:data.expires_at as string};
}
