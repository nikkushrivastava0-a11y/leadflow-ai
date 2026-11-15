import "server-only";
import { weeklyReportMessage, type WeeklyMetrics } from "@/lib/weekly-report";
import { validEmail } from "@/lib/notification-email";
import { ownerEmail, sendJobEmail } from "./email.ts";
import type { AutomationDb, Job } from "./runtime.ts";
export async function processWeeklyReport(db:AutomationDb,job:Job){
 const {data:settings,error:settingsError}=await db.from("automation_settings").select("weekly_report_enabled").eq("client_slug",job.client_slug).maybeSingle();
 if(settingsError)throw new Error("settings_read");if(settings?.weekly_report_enabled===false)return {skipped:true};
 return sendJobEmail(db,job,async()=>{
  const start=String(job.payload.start),end=String(job.payload.end);
  const {data:prior,error:readError}=await db.from("weekly_owner_reports").select("metrics").eq("job_id",job.id).maybeSingle();
  if(readError)throw new Error("report_read");
  let metrics=prior?.metrics as WeeklyMetrics|undefined;
  if(!metrics){
   const {data,error}=await db.rpc("automation_weekly_metrics",{p_slug:job.client_slug,p_start:start,p_end:end});
   if(error||!data)throw new Error("report_metrics");metrics=data as WeeklyMetrics;
   const {error:saveError}=await db.from("weekly_owner_reports").upsert({job_id:job.id,client_slug:job.client_slug,period_start:start,period_end:end,metrics},{onConflict:"job_id",ignoreDuplicates:true});
   if(saveError)throw new Error("report_save");
  }
  const owner=await ownerEmail(db,job.client_slug),from=process.env.RESEND_FROM_EMAIL||"";
  if(!validEmail(from)||!validEmail(owner.email))throw new Error("invalid_email");
  return {from,to:owner.email,subject:"Your weekly LeadFlow AI report",text:weeklyReportMessage(owner.name,start,end,metrics)};
 });
}
