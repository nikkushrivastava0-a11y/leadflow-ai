import { extractScoringSignals } from "./lead-scoring-signals.ts";

type LeadForScoring = {
  name: string;
  email: string;
  phone: string;
  source: string;
  notes: string;
};

type LeadScore = { score: number; reason: string };

/** A deterministic, truthfully-labelled result if AI is unavailable. */
function ruleBasedScore(lead: LeadForScoring): LeadScore {
  const signals = extractScoringSignals(lead);
  let score = 30;
  if (signals.hasEmail) score += 15;
  if (signals.hasPhone) score += 20;
  if (signals.source === "referral") score += 15;
  else if (signals.source === "website") score += 8;

  return {
    score: Math.min(100, score),
    reason: "Rule-based estimate (AI unavailable; no intent analysis).",
  };
}

/**
 * This function never transmits raw lead text or contact information to AI:
 * the model receives only a fixed schema of locally-derived booleans and an
 * allowlisted source category. Lead notes may contain personal information
 * and prompt injection; their exact text remains on the server.
 */
export async function scoreLead(lead: LeadForScoring): Promise<LeadScore> {
  const fallback = ruleBasedScore(lead);
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return fallback;

  const model = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
  if (!/^[a-zA-Z0-9._-]{2,80}$/.test(model)) return fallback;

  const signals = extractScoringSignals(lead);
  const prompt = [
    "Score a prospective sales enquiry from 0 (unlikely) to 100 (high intent).",
    "Use ONLY these structured features; they are imperfect indicators.",
    "A referral and explicit request to discuss fees or admission can indicate interest.",
    "No feature proves a person will buy. Do not invent information.",
    "Produce JSON with score (integer 0-100) and reason (one short plain sentence).",
    JSON.stringify(signals),
  ].join("\n");

  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                score: { type: "INTEGER", minimum: 0, maximum: 100 },
                reason: { type: "STRING" },
              },
              required: ["score", "reason"],
            },
          },
        }),
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!response.ok) {
      console.error("Gemini scoring API returned:", response.status);
      return fallback;
    }

    const data = await response.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof raw !== "string" || raw.length > 4096) return fallback;

    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return fallback;
    }
    const value = parsed as Record<string, unknown>;
    if (
      typeof value.score !== "number" ||
      !Number.isInteger(value.score) ||
      value.score < 0 || value.score > 100 ||
      typeof value.reason !== "string"
    ) return fallback;

    const reason = value.reason.trim();
    if (
      !reason || reason.length > 160 ||
      /https?:\/\/|www\.|<[^>]+>|[\w.+-]+@[\w.-]+\.\w+/i.test(reason) ||
      /[\u0000-\u001F\u007F]/.test(reason)
    ) return fallback;

    return { score: value.score, reason };
  } catch (error) {
    console.error(
      "Gemini scoring failed:",
      error instanceof Error ? error.name : "UnknownError"
    );
    return fallback;
  }
}
