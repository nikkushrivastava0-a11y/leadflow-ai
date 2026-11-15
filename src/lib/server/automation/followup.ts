import "server-only";
import { dueStage, replyDraft } from "@/lib/followup-draft";
import { validEmail } from "@/lib/notification-email";
import { ownerEmail, sendJobEmail } from "./email.ts";
import type { AutomationDb, Job } from "./runtime.ts";
export async function processFollowup(db: AutomationDb, job: Job) {
 if (!job.lead_id) return { skipped: true };
 const {data:lead,error}=await db.from("leads").select("status,created_at,email,phone,source,notes").eq("id",job.lead_id).eq("client_slug",job.client_slug).maybeSingle();
 if(error)throw new Error("lead_read");
 const {data:settings,error:settingsError}=await db.from("automation_settings").select("brand_voice,language,reply_language,followups_enabled").eq("client_slug",job.client_slug).maybeSingle();
 if(settingsError)throw new Error("settings_read");
 if(!lead||lead.status!=="new"||settings?.followups_enabled===false||dueStage(lead.created_at)!==job.payload.stage)return {skipped:true};
 return sendJobEmail(db,job,async()=>{
  const {data:existing,error:readError}=await db.from("followup_drafts").select("text").eq("job_id",job.id).maybeSingle();
  if(readError)throw new Error("draft_read");
  let draft=existing?.text;
  if(!draft){
   const result=await replyDraft(lead,settings?.brand_voice||"friendly",settings?.reply_language||settings?.language||"english");
   const {error}=await db.from("followup_drafts").upsert({job_id:job.id,lead_id:job.lead_id,client_slug:job.client_slug,text:result.text,engine:result.engine},{onConflict:"job_id",ignoreDuplicates:true});
   if(error)throw new Error("draft_save");draft=result.text;
  }
  const owner=await ownerEmail(db,job.client_slug),from=process.env.RESEND_FROM_EMAIL||"";
  if(!validEmail(from)||!validEmail(owner.email))throw new Error("invalid_email");
  return {from,to:owner.email,subject:"An enquiry needs your follow-up",text:`An unanswered enquiry in ${owner.name} has reached the ${job.payload.stage}-hour reminder.\n\nSuggested reply (review before sending):\n${draft}\n\nOpen your LeadFlow AI dashboard to review the lead. This draft has not been sent to the customer.`};
 });
}
