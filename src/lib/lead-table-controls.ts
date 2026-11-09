import type { Lead } from "./types";

export type LeadSort = "newest" | "oldest" | "score-desc" | "score-asc" | "name";
export type LeadStatusFilter =
  | "all"
  | "new"
  | "contacted"
  | "qualified"
  | "won"
  | "lost";

export type LeadTableFilters = {
  query: string;
  status: LeadStatusFilter;
  sort: LeadSort;
  page: number;
  pageSize: number;
};

export type LeadTableView = {
  rows: Lead[];
  matching: number;
  page: number;
  totalPages: number;
  start: number;
  end: number;
};

function compareNumber(a: number, b: number): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function timestamp(input: string | null | undefined): number {
  const value = Date.parse(input || "");
  return Number.isFinite(value) ? value : 0;
}

/**
 * Client-side control over the leads already authorized and fetched by the
 * dashboard. This does NOT fetch more data, make unauthenticated API requests,
 * bypass tenant RLS, or expose the user's lead list outside the session.
 *
 * Future server-side pagination requires separate RLS-verified queries,
 * especially once lead counts grow past PostgREST default row limits.
 */
export function selectVisibleLeads(
  leads: readonly Lead[],
  filters: LeadTableFilters
): LeadTableView {
  const query = filters.query.trim().toLocaleLowerCase();
  const status = filters.status;
  const eligible = leads
    .map((lead, index) => ({ lead, index }))
    .filter(({ lead }) => {
      if (status !== "all" && lead.status !== status) return false;
      if (!query) return true;

      return [lead.name, lead.email, lead.phone, lead.source]
        .some((field) => (field || "").toLocaleLowerCase().includes(query));
    });

  eligible.sort((a, b) => {
    const first = a.lead;
    const second = b.lead;
    let outcome = 0;
    switch (filters.sort) {
      case "oldest":
        outcome = compareNumber(timestamp(first.created_at), timestamp(second.created_at));
        break;
      case "score-desc":
        outcome = compareNumber(Number(second.score) || 0, Number(first.score) || 0);
        break;
      case "score-asc":
        outcome = compareNumber(Number(first.score) || 0, Number(second.score) || 0);
        break;
      case "name":
        outcome = first.name.localeCompare(second.name, undefined, {
          sensitivity: "base",
          numeric: true,
        });
        break;
      case "newest":
      default:
        outcome = compareNumber(timestamp(second.created_at), timestamp(first.created_at));
    }
    // Stable across renders, even when two dates/scores/names are identical.
    return outcome || a.index - b.index;
  });

  const pageSize =
    Number.isInteger(filters.pageSize) && filters.pageSize > 0
      ? Math.min(filters.pageSize, 50)
      : 10;
  const totalPages = Math.max(1, Math.ceil(eligible.length / pageSize));
  const requestedPage = Number.isInteger(filters.page) ? filters.page : 1;
  const page = Math.min(totalPages, Math.max(1, requestedPage));
  const offset = (page - 1) * pageSize;
  const rows = eligible.slice(offset, offset + pageSize).map(({ lead }) => lead);

  return {
    rows,
    matching: eligible.length,
    page,
    totalPages,
    start: eligible.length === 0 ? 0 : offset + 1,
    end: Math.min(offset + rows.length, eligible.length),
  };
}
