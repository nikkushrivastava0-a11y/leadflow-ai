export const dynamic='force-dynamic';
import {pilotAccess} from '@/lib/server/pilot-access';import {redirect} from 'next/navigation';
export default async function ProPage(){const access=await pilotAccess();if(!access.active)redirect('/dashboard/billing');
 return <main className="mx-auto max-w-xl space-y-4 p-8"><h1 className="text-2xl font-semibold">Pilot Pro workspace</h1><p>Your {access.mode==='trial'?'trial':'verified test payment'} grants {access.plan} access until {access.expiresAt}. Access is checked on every request.</p><p>This pilot does not enable real paid billing.</p><nav className="flex flex-wrap gap-4"><a href="/dashboard/activity" className="underline">Reply drafts and reports</a><a href="/dashboard/analytics" className="underline">Analytics</a><a href="/dashboard" className="underline">Lead workspace</a></nav></main>;
}
