import { resolveOwnerScope } from "@/lib/server/owner-scope";
import { redirect } from "next/navigation";
export default async function ActivityPage(){
 const scope=await resolveOwnerScope();if(!scope.ok)redirect("/login");
 const [activity,qualifications,drafts,reports]=await Promise.all([
  scope.supabase.from("lead_activity").select("id,event,lead_id,details,created_at").eq("client_slug",scope.slug).order("created_at",{ascending:false}).limit(50),
  scope.supabase.from("lead_qualifications").select("lead_id,score,fit,summary,next_action,engine").eq("client_slug",scope.slug).order("created_at",{ascending:false}).limit(20),
  scope.supabase.from("followup_drafts").select("job_id,lead_id,text,engine,created_at").eq("client_slug",scope.slug).order("created_at",{ascending:false}).limit(20),
  scope.supabase.from("weekly_owner_reports").select("job_id,period_start,period_end,metrics").eq("client_slug",scope.slug).order("period_start",{ascending:false}).limit(8),
 ]);
 if(activity.error||qualifications.error||drafts.error||reports.error)return <main className="p-8"><h1 className="text-2xl">Activity unavailable</h1><p>Automation setup or access verification is pending. Please retry later.</p><a href="/dashboard" className="underline">Back to leads</a></main>;
 const ids=[...new Set([...(activity.data||[]),...(qualifications.data||[]),...(drafts.data||[])].map(x=>x.lead_id).filter(Boolean))];
 const names=new Map<string,string>();
 if(ids.length){const {data}=await scope.supabase.from("leads").select("id,name").in("id",ids).eq("client_slug",scope.slug);for(const lead of data||[])names.set(lead.id,lead.name);}
 const name=(id:string|null)=>id?names.get(id)||"Enquiry":"Workspace";
 return <main className="mx-auto max-w-4xl space-y-8 p-6"><h1 className="text-2xl font-semibold">Workspace activity</h1><a href="/dashboard" className="underline">Back to leads</a>
 <section className="space-y-3"><h2 className="text-xl font-semibold">Latest 20 qualifications</h2>{qualifications.data?.length?qualifications.data.map(q=><article key={q.lead_id} className="rounded border p-4"><h3 className="font-medium">{name(q.lead_id)} · {q.score}/100 · {q.fit} fit</h3><p>{q.summary}</p><p>Next action: {q.next_action}</p><p className="text-sm">Estimate from {q.engine}; buying intent unverified.</p></article>):<p>No qualification results yet.</p>}</section>
 <section className="space-y-3"><h2 className="text-xl font-semibold">Latest 20 reply drafts</h2>{drafts.data?.length?drafts.data.map(d=><article key={d.job_id} className="rounded border p-4"><h3 className="font-medium">{name(d.lead_id)}</h3><p className="whitespace-pre-wrap">{d.text}</p><p className="text-sm">Review before sending. This draft has not been sent to the customer.</p></article>):<p>No reply drafts yet.</p>}</section>
 <section className="space-y-3"><h2 className="text-xl font-semibold">Latest 8 weekly reports</h2>{reports.data?.length?reports.data.map(r=><article key={r.job_id} className="rounded border p-4"><h3 className="font-medium">Week starting {new Date(r.period_start).toLocaleDateString("en-IN",{timeZone:"Asia/Kolkata"})}</h3><p>New enquiries: {r.metrics.total} · High score: {r.metrics.hot} · Won: {r.metrics.won} · Unanswered: {r.metrics.unanswered}</p><p className="text-sm">Status and scores reflect report generation.</p></article>):<p>No weekly reports yet.</p>}</section>
 <section className="space-y-3"><h2 className="text-xl font-semibold">Latest 50 events</h2>{activity.data?.length?<ol className="space-y-3">{activity.data.map(a=><li key={a.id} className="rounded border p-4"><p>{name(a.lead_id)} · {a.event}</p>{a.event==="lead.status_changed"?<p>{String(a.details.from)} → {String(a.details.to)}</p>:null}<time dateTime={a.created_at} className="text-sm">{new Date(a.created_at).toLocaleString("en-IN",{timeZone:"Asia/Kolkata"})} IST</time></li>)}</ol>:<p>No events yet.</p>}</section></main>;
}
