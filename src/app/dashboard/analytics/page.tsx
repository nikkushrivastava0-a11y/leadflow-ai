import {resolveOwnerScope} from '@/lib/server/owner-scope';import {redirect} from 'next/navigation';
export default async function Analytics(){
 const scope=await resolveOwnerScope();if(!scope.ok)redirect('/login');
 if(process.env.LEADFLOW_ANALYTICS_ENABLED!=='true')return <main className="p-8">Analytics are not available yet. <a href="/dashboard">Back to leads</a></main>;
 const {data,error}=await scope.supabase.rpc('pilot_analytics',{p_slug:scope.slug});
 if(error||!data)return <main className="p-8">Analytics could not load. Please retry.</main>;
 return <main className="mx-auto max-w-3xl space-y-6 p-8"><h1 className="text-2xl font-semibold">Last 30 days</h1><dl className="grid gap-4 sm:grid-cols-3"><div className="rounded border p-4"><dt>Enquiries</dt><dd className="text-2xl">{data.leads}</dd></div><div className="rounded border p-4"><dt>Marked won</dt><dd className="text-2xl">{data.won} ({data.conversion_percent}%)</dd></div><div className="rounded border p-4"><dt>Average first status change</dt><dd>{data.response_seconds==null?'No response recorded':Math.round(data.response_seconds/60)+' minutes'}</dd></div></dl><p>Status-change time is a response-time estimate. Inbox replies and purchases are not independently tracked.</p><h2 className="text-xl font-semibold">Lead sources</h2><ul>{Object.entries(data.sources||{}).map(([source,count])=><li key={source}>{source}: {String(count)}</li>)}</ul><a className="underline" href="/api/leads/export">Download leads CSV</a><p><a href="/dashboard" className="underline">Back to leads</a></p></main>;
}
