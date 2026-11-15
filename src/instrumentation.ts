export async function register(){
 if(process.env.NEXT_RUNTIME!=="nodejs")return;
 const {validateServerEnv}=await import("./lib/server-env");
 const issues=validateServerEnv(process.env);
 if(issues.length){
  console.error("LeadFlow environment validation:",issues.map(i=>`${i.name}:${i.code}`).join(", "));
  if(issues.some(i=>i.code==="unsafe_target") || ((process.env.VERCEL_ENV==="preview" || process.env.LEADFLOW_ENV==="staging") && issues.some(i=>["NEXT_PUBLIC_SUPABASE_URL","LEADFLOW_STAGING_PROJECT_REF"].includes(i.name))))throw new Error("Unsafe LeadFlow environment target; startup refused.");
 }
}
