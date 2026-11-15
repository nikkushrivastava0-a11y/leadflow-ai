import "server-only";
import { createPublicSubmissionClient } from "@/lib/server/public-submission-client";
import { qualifyLead } from "@/lib/qualification";
import { processWeeklyReport } from "./weekly.ts";
import { processFollowup } from "./followup.ts";
import { processNotification } from "./email.ts";
import { timingSafeEqual } from "node:crypto";

export type Job = { id: string; token: string; kind: string; lead_id: string | null; client_slug: string; payload: Record<string, unknown>; attempts: number };
export function cronAuthorized(header: string | null, secret: string | undefined) {
  if (!secret || secret.length < 32 || !header) return false;
  const actual = Buffer.from(header), expected = Buffer.from(`Bearer ${secret}`);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
export function automationDb() {
  const db = createPublicSubmissionClient();
  if (!db) throw new Error("automation_unconfigured");
  return db;
}
export type AutomationDb = ReturnType<typeof automationDb>;
export async function processJob(db: AutomationDb, job: Job): Promise<Record<string, unknown>> {
  if (job.kind === "weekly_report") return processWeeklyReport(db, job);
  if (job.kind === "followup") return processFollowup(db, job);
  if (["owner_alert", "customer_confirmation"].includes(job.kind)) return processNotification(db, job);
  if (job.kind !== "qualification" || !job.lead_id) throw new Error("unsupported_job");
  const { data: lead, error } = await db.from("leads").select("email,phone,source,notes").eq("id", job.lead_id).eq("client_slug", job.client_slug).maybeSingle();
  if (error) throw new Error("lead_read_failed");
  if (!lead) return { skipped: true };
  return { ...await qualifyLead(lead) };
}
export async function runAutomation(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  if (!cronAuthorized(request.headers.get("authorization"), process.env.CRON_SECRET)) return Response.json({ error: "Unauthorized" }, { status: 401, headers });
  if (process.env.LEADFLOW_AUTOMATION_ENABLED !== "true") return Response.json({ enabled: false }, { headers });
  try {
    const db = automationDb();
    if (process.env.LEADFLOW_EMAIL_ENABLED === "true" && process.env.LEADFLOW_FOLLOWUPS_ENABLED === "true") {
      const { error } = await db.rpc("automation_schedule_followups");
      if (error) throw new Error("followup_schedule_failed");
    }
    if (process.env.LEADFLOW_EMAIL_ENABLED === "true" && process.env.LEADFLOW_WEEKLY_REPORTS_ENABLED === "true") {
      const { error } = await db.rpc("automation_schedule_weekly");
      if (error) throw new Error("weekly_schedule_failed");
    }
    // Process bounded batches; claims use SKIP LOCKED plus token-owned leases.
    const { data: jobs, error } = await db.rpc("automation_claim", { p_kinds: ["qualification", ...(process.env.LEADFLOW_EMAIL_ENABLED === "true" ? ["owner_alert", "customer_confirmation", ...(process.env.LEADFLOW_WEEKLY_REPORTS_ENABLED === "true" ? ["weekly_report"] : []), ...(process.env.LEADFLOW_FOLLOWUPS_ENABLED === "true" ? ["followup"] : [])] : [])], p_limit: 2 });
    if (error) throw new Error("claim_failed");
    let completed = 0, failed = 0;
    for (const job of (jobs || []) as Job[]) {
      try {
        const result = await processJob(db, job);
        const { error } = await db.rpc("automation_finish", { p_id: job.id, p_token: job.token, p_result: result });
        if (error) throw new Error("finish_failed");
        completed++;
      } catch {
        const { error } = await db.rpc("automation_fail", { p_id: job.id, p_token: job.token });
        if (error) throw new Error("retry_write_failed");
        failed++;
      }
    }
    return Response.json({ completed, failed }, { headers });
  } catch { return Response.json({ error: "Automation unavailable" }, { status: 503, headers }); }
}
