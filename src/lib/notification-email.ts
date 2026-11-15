export type EmailMessage = { from: string; to: string; subject: string; text: string };
export function validEmail(v: unknown): v is string {
  return typeof v === "string" && v.length <= 254 && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(v);
}
export function notificationMessage(kind: "owner_alert" | "customer_confirmation", from: string, to: string, business: string): EmailMessage {
  if (!validEmail(from) || !validEmail(to)) throw new Error("invalid_email");
  const name = business.replace(/[\r\n\u0000-\u001f]/g, " ").slice(0, 100);
  return { from, to, subject: kind === "owner_alert" ? "New enquiry in LeadFlow AI" : "Your enquiry has been received",
    text: kind === "owner_alert" ? `A new enquiry is waiting in the ${name} workspace. Sign in to LeadFlow AI to review the contact details and follow up.` :
      `${name} has received your enquiry. The business will review it and contact you. This confirmation does not guarantee a booking or purchase. If you did not submit an enquiry, you can ignore this message.` };
}
export async function deliverEmail(message: EmailMessage, key: string, apiKey: string, send: typeof fetch = fetch, env: Record<string,string|undefined> = process.env) {
  const mode=env.LEADFLOW_EMAIL_MODE || "sandbox";
  if(!["sandbox","live-approved"].includes(mode))throw new Error("email_mode_unapproved");
  if((env.VERCEL_ENV==="preview"||env.LEADFLOW_ENV==="staging")&&mode!=="sandbox")throw new Error("staging_email_must_be_sandbox");
  const outbound=mode==="sandbox"?{...message,to:"delivered@resend.dev"}:message;
  const response = await send("https://api.resend.com/emails", { method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": key },
    body: JSON.stringify(outbound), signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error("email_provider_failure");
  const result = await response.json();
  if (typeof result.id !== "string" || result.id.length > 100) throw new Error("email_provider_response");
  return result.id as string;
}
