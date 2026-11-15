import { resolveOwnerScope } from "@/lib/server/owner-scope";
import { readBillingConfig } from "@/lib/server/billing/core";
import { testAccess } from "@/lib/server/billing/access";
import { TestCheckout } from "@/components/test-checkout";
import { redirect } from "next/navigation";
export default async function BillingPage(){
 const scope=await resolveOwnerScope();if(!scope.ok)redirect("/login");
 const config=process.env.LEADFLOW_TEST_CHECKOUT_UI==="true"?readBillingConfig(process.env):null;
 const access=await testAccess();
 return <main className="mx-auto max-w-2xl space-y-6 p-8"><h1 className="text-2xl font-semibold">Billing sandbox</h1>
 {config?<><p>Real payments are unavailable. This sandbox activates expiring test access only.</p><TestCheckout plans={Object.entries(config.plans).map(([id,plan])=>({id,amount:plan.amount,durationDays:plan.durationDays}))}/></>:<p>Test checkout is not configured yet.</p>}
 {access.active?<p>Test access: {access.plan}, expires {new Date(access.expiresAt).toISOString()}. <a href="/dashboard/pro" className="underline">Open test workspace</a></p>:<p>No active test access.</p>}
 <a href="/dashboard" className="underline">Back to dashboard</a></main>;
}
