export async function register(){
 if(process.env.NEXT_RUNTIME!=="nodejs")return;
 const {validateServerEnv,mustRefuseStartup}=await import("./lib/server-env");
 const issues=validateServerEnv(process.env);
 if(issues.length){
  console.error("LeadFlow environment validation:",issues.map(i=>`${i.name}:${i.code}`).join(", "));
  if(mustRefuseStartup(process.env,issues))throw new Error("Invalid LeadFlow environment; startup refused.");
 }
}
