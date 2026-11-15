/** Datetimes crossing the server action boundary must be canonical UTC ISO values. */
export function validateFollowUp(value: unknown):
  | { ok: true; value: string | null }
  | { ok: false; reason: string } {
  if (value === null) return { ok: true, value: null };
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) {
    return { ok: false, reason: "Choose a valid follow-up date and time." };
  }
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()) || date.toISOString() !== value) {
    return { ok: false, reason: "Choose a valid follow-up date and time." };
  }
  return { ok: true, value };
}
