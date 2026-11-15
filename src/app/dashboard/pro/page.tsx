export const dynamic = "force-dynamic";
import { testAccess } from "@/lib/server/billing/access";
import { redirect } from "next/navigation";
export default async function TestProPage(){
 const access=await testAccess();if(!access.active)redirect("/dashboard/billing");
 return <main className="mx-auto max-w-xl space-y-4 p-8"><h1 className="text-2xl font-semibold">Test Pro workspace</h1><p>Your captured test payment grants {access.plan} access until {access.expiresAt}. Refunds, disputes and expiry remove this access automatically on the next request.</p><p>This verifies the entitlement flow; it does not enable live paid features.</p><a href="/dashboard" className="underline">Back to leads</a></main>;
}
