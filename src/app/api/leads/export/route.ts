import {resolveOwnerScope} from '@/lib/server/owner-scope';import {leadsCsv} from '@/lib/lead-analytics';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const headers={'Cache-Control':'private, no-store'};
 if(request.headers.get('sec-fetch-site')==='cross-site')return Response.json({error:'Same-site download required'},{status:403,headers});
 if(process.env.LEADFLOW_ANALYTICS_ENABLED!=='true')return Response.json({error:'Export unavailable'},{status:503,headers});
 const owner=await resolveOwnerScope();if(!owner.ok)return Response.json({error:'Sign in to your workspace'},{status:401,headers});
 const {data,error}=await owner.supabase.rpc('pilot_export_leads',{p_slug:owner.slug});
 if(error||!Array.isArray(data))return Response.json({error:'Export could not be prepared; limit 10,000 leads'},{status:503,headers});
 return new Response(leadsCsv(data),{headers:{...headers,'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="leadflow-leads.csv"','X-Content-Type-Options':'nosniff'}});
}
