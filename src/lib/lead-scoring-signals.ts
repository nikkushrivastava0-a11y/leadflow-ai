/**
 * Model-safe sales qualification features.
 *
 * Never send a lead's name, contact details, free-text notes or an arbitrary
 * lead source to a model. Notes can contain personal data and instructions.
 * Extract a small set of boolean signals locally and discard the text.
 */
export type ScoringSource =
  | "referral" | "website" | "social" | "email" | "manual" | "other";

export type ScoringSignals = {
  hasEmail: boolean;
  hasPhone: boolean;
  source: ScoringSource;
  mentionsAdmissions: boolean;
  asksAboutFees: boolean;
  asksAboutSchedule: boolean;
  requestsCallback: boolean;
};

export function extractScoringSignals(input: {
  email?: string | null;
  phone?: string | null;
  source?: string | null;
  notes?: string | null;
}): ScoringSignals {
  const source = String(input.source || "").trim().toLowerCase();
  const allowed: readonly string[] = [
    "referral", "website", "social", "email", "manual",
  ];
  const cleanSource: ScoringSource =
    source === "website form" ? "website" :
      allowed.includes(source) ? source as ScoringSource : "other";

  // Only inspect a bounded text sample locally. Never include it in the result.
  const notes = String(input.notes || "").slice(0, 1000).toLowerCase();

  return {
    hasEmail: Boolean(String(input.email || "").trim()),
    hasPhone: Boolean(String(input.phone || "").trim()),
    source: cleanSource,
    mentionsAdmissions: /\b(admission|admissions|enroll|enrol|registration|join the course)\b/.test(notes),
    asksAboutFees: /\b(fees?|pricing|price|cost|tuition)\b/.test(notes),
    asksAboutSchedule: /\b(schedule|timings?|batches|start date|classes)\b/.test(notes),
    requestsCallback: /\b(call ?back|call me|please call|phone me)\b/.test(notes),
  };
}
