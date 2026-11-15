import { testAccess } from "@/lib/server/billing/access";
export const dynamic="force-dynamic";
export async function GET(){return Response.json(await testAccess(),{headers:{"Cache-Control":"no-store"}});}
