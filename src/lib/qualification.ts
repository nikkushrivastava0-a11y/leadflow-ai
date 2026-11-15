import { extractScoringSignals, type ScoringSignals } from "./lead-scoring-signals.ts";

export type Qualification = { score: number; fit: "low" | "medium" | "high"; summary: string; nextAction: string };
export type QualificationOutcome = { value: Qualification; engine: "rules" | "gemini"; failure: "not_configured" | "provider_error" | "invalid_response" | null };
export const qualificationSchema = {
  type: "OBJECT", properties: {
    score: { type: "INTEGER", minimum: 0, maximum: 100 },
    fit: { type: "STRING", enum: ["low", "medium", "high"] },
    summary: { type: "STRING" }, nextAction: { type: "STRING" },
  }, required: ["score", "fit", "summary", "nextAction"],
} as const;
export const fitForScore = (score: number): Qualification["fit"] => score >= 70 ? "high" : score >= 40 ? "medium" : "low";
export function safeModelText(value: unknown, max = 240): value is string {
  return typeof value === "string" && value.trim() === value && value.length > 0 && value.length <= max &&
    !/https?:\/\/|www\.|<[^>]+>|[\w.+-]+@[\w.-]+\.\w+|[\u0000-\u001F\u007F]/i.test(value);
}
/** Runtime schema validation: exact keys, bounded values and consistent labels. */
export function parseQualification(raw: string): Qualification {
  if (raw.length > 2048) throw new Error("invalid_response");
  const v: unknown = JSON.parse(raw);
  if (!v || typeof v !== "object" || Array.isArray(v)) throw new Error("invalid_response");
  const r = v as Record<string, unknown>;
  if (Object.keys(r).sort().join() !== "fit,nextAction,score,summary" || !Number.isInteger(r.score) || Number(r.score) < 0 || Number(r.score) > 100 ||
    r.fit !== fitForScore(Number(r.score)) || !safeModelText(r.summary) || !safeModelText(r.nextAction)) throw new Error("invalid_response");
  return r as Qualification;
}
export function rulesQualification(s: ScoringSignals): Qualification {
  const score = Math.min(100, 10 + (s.hasEmail ? 10 : 0) + (s.hasPhone ? 15 : 0) + (s.source === "referral" ? 15 : 0) +
    (s.asksAboutFees ? 15 : 0) + (s.asksAboutSchedule ? 10 : 0) + (s.requestsCallback ? 20 : 0) + (s.mentionsAdmissions ? 5 : 0));
  return { score, fit: fitForScore(score), summary: "Rule-based estimate from contact and enquiry signals; buying intent is unverified.",
    nextAction: s.requestsCallback ? "Call to understand the enquiry and confirm requirements." : "Ask about requirements and preferred contact time." };
}
export async function qualifyLead(input: Parameters<typeof extractScoringSignals>[0], env: Record<string, string | undefined> = process.env, send: typeof fetch = fetch): Promise<QualificationOutcome> {
  const signals = extractScoringSignals(input);
  const value = rulesQualification(signals); // Rules always execute before any provider call.
  if (!env.GEMINI_API_KEY || !/^[a-zA-Z0-9._-]{2,80}$/.test(env.GEMINI_MODEL || "")) return { value, engine: "rules", failure: "not_configured" };
  try {
    const response = await send(`https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_MODEL}:generateContent`, {
      method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
      body: JSON.stringify({ contents: [{ parts: [{ text: "Qualify an enquiry using ONLY these signals. Never invent facts or include personal data. Return score 0-100, fit low (<40), medium (40-69), high (70+), short summary and nextAction. These are estimates, not purchase predictions.\n" + JSON.stringify({ signals, rules: value }) }] }],
        generationConfig: { responseMimeType: "application/json", responseSchema: qualificationSchema, maxOutputTokens: 300 } }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return { value, engine: "rules", failure: "provider_error" };
    const data = await response.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof raw !== "string") return { value, engine: "rules", failure: "invalid_response" };
    try { return { value: parseQualification(raw), engine: "gemini", failure: null }; }
    catch { return { value, engine: "rules", failure: "invalid_response" }; }
  } catch { return { value, engine: "rules", failure: "provider_error" }; }
}
