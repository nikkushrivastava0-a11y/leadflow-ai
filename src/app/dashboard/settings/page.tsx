import { resolveOwnerScope } from "@/lib/server/owner-scope";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
export default async function AutomationSettings() {
 const scope=await resolveOwnerScope();if(!scope.ok)redirect("/login");
 const {data,error}=await scope.supabase.from("automation_settings").select("brand_voice,language,reply_language,followups_enabled,weekly_report_enabled").eq("client_slug",scope.slug).maybeSingle();
 if(error)return <main className="p-8">Automation settings are unavailable until setup is complete.</main>;
 async function save(form:FormData){"use server";
  const owner=await resolveOwnerScope();if(!owner.ok)redirect("/login");
  const voice=String(form.get("brand_voice")),language=String(form.get("language"));
  if(!["friendly","professional","concise"].includes(voice)||!["english","hinglish","hindi"].includes(language))throw new Error("Invalid preferences");
  const {error}=await owner.supabase.from("automation_settings").upsert({client_slug:owner.slug,brand_voice:voice,language:language==="hindi"?"english":language,reply_language:language,followups_enabled:form.get("followups")==="on",weekly_report_enabled:form.get("weekly")==="on"},{onConflict:"client_slug"});
  if(error)throw new Error("Preferences could not be saved");revalidatePath("/dashboard/settings");redirect("/dashboard/settings?saved=1");
 }
 return <main className="mx-auto max-w-lg space-y-6 p-8"><h1 className="text-2xl font-semibold">Follow-up preferences</h1><p>Suggested replies stay as drafts for your review. Reminders go to your verified owner email.</p><form action={save} className="space-y-4">
 <label className="block">Business voice<select name="brand_voice" defaultValue={data?.brand_voice||"friendly"} className="ml-3 border p-2"><option value="friendly">Friendly</option><option value="professional">Professional</option><option value="concise">Concise</option></select></label>
 <label className="block">Reply language<select name="language" defaultValue={data?.reply_language||data?.language||"english"} className="ml-3 border p-2"><option value="english">English</option><option value="hinglish">Hinglish</option><option value="hindi">हिन्दी</option></select></label>
 <label className="block"><input type="checkbox" name="followups" defaultChecked={data?.followups_enabled??true}/> Email me follow-up reminders</label>
 <label className="block"><input type="checkbox" name="weekly" defaultChecked={data?.weekly_report_enabled??true}/> Email me weekly reports</label>
 <button className="rounded border px-4 py-2" type="submit">Save preferences</button></form><a href="/dashboard" className="underline">Back to dashboard</a></main>;
}
