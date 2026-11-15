import { validateServerEnv } from "@/lib/server-env";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(){
 const issues=validateServerEnv(process.env);
 return Response.json({status:issues.length?"not_ready":"configured",checks:{environment:issues.length===0,database:"not_probed",providers:"not_probed"},issues},{status:issues.length?503:200,headers:{"Cache-Control":"no-store"}});
}
