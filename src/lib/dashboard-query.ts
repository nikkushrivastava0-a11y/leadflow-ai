import { LEAD_STATUSES } from "./types.ts";

export function parseDashboardPage(value: unknown): number {
  return typeof value === "string" && /^[1-9]\d{0,5}$/.test(value)
    ? Number(value)
    : 1;
}

export function normalizeLeadSearch(value: unknown): string {
  return typeof value === "string"
    ? value.trim().replace(/[^a-zA-Z0-9 @.+_-]/g, "").slice(0, 80)
    : "";
}

export function parseLeadStatus(value: unknown): string {
  return typeof value === "string" &&
    LEAD_STATUSES.some((allowed) => allowed === value)
    ? value : "all";
}

/**
 * Keep ownership constraints and search predicates in a single PostgREST .or().
 * Calling .or() twice would overwrite a tenant restriction.
 */
export function buildTenantLeadFilter(slug: string, userId: string, query: string): string {
  const owner = `client_slug.eq.${slug},and(client_slug.is.null,user_id.eq.${userId})`;
  if (!query) return owner;
  const match = `or(name.ilike.*${query}*,email.ilike.*${query}*,phone.ilike.*${query}*,source.ilike.*${query}*)`;
  return `and(client_slug.eq.${slug},${match}),and(client_slug.is.null,user_id.eq.${userId},${match})`;
}
