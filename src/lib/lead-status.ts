/** Canonical CRM stages. Keep this module dependency-free for server and tests. */
export const LEAD_STATUSES = ["new", "contacted", "qualified", "won", "lost"] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export function isLeadStatus(value: unknown): value is LeadStatus {
  return typeof value === "string" && LEAD_STATUSES.some((status) => status === value);
}
