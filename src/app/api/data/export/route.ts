import {resolveOwnerScope} from '@/lib/server/owner-scope';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const headers={'Cache-Control':'private, no-store'};
 if(process.env.LEADFLOW_PRIVACY_TOOLS_ENABLED!=='true')return Response.json({error:'Data export unavailable'},{status:503,headers});
 if(request.headers.get('sec-fetch-site')==='cross-site')return Response.json({error:'Same-site download required'},{status:403,headers});
 const owner=await resolveOwnerScope();if(!owner.ok)return Response.json({error:'Sign in required'},{status:401,headers});
 const [{data:leads,error},{data:business,error:businessError}]=await Promise.all([owner.supabase.rpc('pilot_export_leads',{p_slug:owner.slug}),owner.supabase.from('clients').select('slug,business_name,trial_started_at,trial_expires_at').eq('owner_user_id',owner.userId).maybeSingle()]);
 if(error||businessError||!Array.isArray(leads))return Response.json({error:'Export unavailable; maximum 10000 enquiries'},{status:503,headers});
 return Response.json({scope:'Business profile and enquiry records',exportedAt:new Date().toISOString(),business,leads},{headers:{...headers,'Content-Disposition':'attachment; filename="leadflow-data.json"'}});
}
