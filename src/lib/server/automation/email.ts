import "server-only";
import { deliverEmail, notificationMessage, type EmailMessage } from "@/lib/notification-email";
import type { AutomationDb, Job } from "./runtime.ts";

export async function sendJobEmail(db: AutomationDb, job: Job, build: () => Promise<EmailMessage | null>) {
  const { data: prior, error: readError } = await db.from("email_deliveries").select("message,created_at,provider_id").eq("job_id", job.id).maybeSingle();
  if (readError) throw new Error("email_snapshot_read");
  if (prior?.provider_id) return { delivery: "already_sent" };
  let saved = prior;
  if (!saved) {
    const message = await build();
    if (!message) return { delivery: "skipped" };
    const { data, error } = await db.rpc("automation_prepare_email", { p_id: job.id, p_token: job.token, p_message: message });
    if (error || !data) throw new Error("email_snapshot_write");
    saved = data as { message: EmailMessage; created_at: string; provider_id: string | null };
  }
  // Resend keys expire after 24h. Never resend an ambiguous attempt after 20h.
  if (Date.now() - Date.parse(saved.created_at) >= 20 * 3600_000) return { delivery: "needs_review" };
  if (["owner_alert", "followup", "weekly_report"].includes(job.kind)) {
    const current = await ownerEmail(db, job.client_slug);
    if (current.email.toLowerCase() !== String(saved.message.to).toLowerCase()) return { delivery: "recipient_changed" };
  }
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("email_unconfigured");
  const id = await deliverEmail(saved.message as EmailMessage, `leadflow/${job.id}`, key);
  const { error } = await db.from("email_deliveries").update({ provider_id: id, sent_at: new Date().toISOString() }).eq("job_id", job.id);
  if (error) throw new Error("email_receipt_write");
  return { delivery: "sent" };
}
export async function ownerEmail(db: AutomationDb, slug: string) {
  const { data: client, error } = await db.from("clients").select("owner_user_id,business_name").eq("slug", slug).maybeSingle();
  if (error || !client?.owner_user_id) throw new Error("owner_lookup");
  const { data, error: authError } = await db.auth.admin.getUserById(client.owner_user_id);
  if (authError || !data.user?.email || !data.user.email_confirmed_at) throw new Error("owner_email_unverified");
  return { email: data.user.email, name: client.business_name || "The business" };
}
export async function processNotification(db: AutomationDb, job: Job) {
  return sendJobEmail(db, job, async () => {
    if (!job.lead_id) return null;
    const { data: lead, error } = await db.from("leads").select("email").eq("id", job.lead_id).eq("client_slug", job.client_slug).maybeSingle();
    if (error) throw new Error("lead_lookup");
    if (!lead) return null;
    const owner = await ownerEmail(db, job.client_slug);
    const to = job.kind === "owner_alert" ? owner.email : lead.email;
    if (!to) return null;
    return notificationMessage(job.kind as "owner_alert" | "customer_confirmation", process.env.RESEND_FROM_EMAIL || "", to, owner.name);
  });
}
