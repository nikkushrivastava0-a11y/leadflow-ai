"use client";

import { useMemo, useState } from "react";
import type { Lead } from "@/lib/types";
import { deleteLead } from "@/lib/actions";
import {
  selectVisibleLeads,
  type LeadSort,
  type LeadStatusFilter,
} from "@/lib/lead-table-controls";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

function statusColor(status: string) {
  switch (status) {
    case "new":
      return "bg-blue-100 text-blue-700";
    case "contacted":
      return "bg-yellow-100 text-yellow-700";
    case "qualified":
      return "bg-purple-100 text-purple-700";
    case "won":
      return "bg-green-100 text-green-700";
    case "lost":
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

function scoreColor(score: number) {
  if (score >= 70) return "bg-green-100 text-green-700";
  if (score >= 40) return "bg-yellow-100 text-yellow-700";
  return "bg-gray-100 text-gray-700";
}

const controlClass =
  "w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-offset-2 focus-visible:outline-2 focus-visible:outline-indigo-600";

export function LeadsTable({ leads }: { leads: Lead[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<LeadStatusFilter>("all");
  const [sort, setSort] = useState<LeadSort>("newest");
  const [page, setPage] = useState(1);

  const view = useMemo(
    () => selectVisibleLeads(leads, { query, status, sort, page, pageSize: 10 }),
    [leads, query, status, sort, page]
  );

  async function handleDelete(id: string) {
    const result = await deleteLead(id);
    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success("Lead deleted");
    }
  }

  if (leads.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center">
        <p className="text-slate-500">No leads yet.</p>
        <p className="text-sm text-slate-400">
          Click &quot;Add Lead&quot; to create your first one.
        </p>
      </div>
    );
  }

  const hasFilters = query.trim() !== "" || status !== "all" || sort !== "newest";

  return (
    <section className="space-y-3" aria-label="Lead search and results">
      <div className="grid gap-3 rounded-lg border bg-white p-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
        <label className="flex min-w-0 flex-col gap-1.5 text-xs font-semibold text-slate-600">
          Search your leads
          <input
            className={controlClass}
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Name, email, phone or source"
            aria-label="Search leads by name, email, phone or source"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-600">
          Status
          <select
            className={controlClass}
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as LeadStatusFilter);
              setPage(1);
            }}
          >
            <option value="all">All statuses</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="qualified">Qualified</option>
            <option value="won">Won</option>
            <option value="lost">Lost</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-600">
          Sort by
          <select
            className={controlClass}
            value={sort}
            onChange={(event) => {
              setSort(event.target.value as LeadSort);
              setPage(1);
            }}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="score-desc">Highest score</option>
            <option value="score-asc">Lowest score</option>
            <option value="name">Name A–Z</option>
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
        <p role="status" aria-live="polite">
          {view.matching === 0
            ? "No matching leads"
            : `Showing ${view.start}–${view.end} of ${view.matching} matching leads`}
        </p>
        {hasFilters && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setStatus("all");
              setSort("newest");
              setPage(1);
            }}
            className="font-medium text-indigo-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Clear filters
          </button>
        )}
      </div>

      {view.rows.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-white p-8 text-center">
          <p className="font-medium text-slate-800">No results for these filters</p>
          <p className="mt-1 text-sm text-slate-500">
            Try another search or clear the filters. Your leads were not changed.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Score</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {view.rows.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell className="font-medium">{lead.name}</TableCell>
                  <TableCell>{lead.email || "—"}</TableCell>
                  <TableCell>{lead.phone || "—"}</TableCell>
                  <TableCell className="capitalize">{lead.source}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={statusColor(lead.status)}>
                      {lead.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={scoreColor(lead.score)}>
                      {lead.score}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Delete lead ${lead.name}`}
                      onClick={() => handleDelete(lead.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" aria-hidden="true" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {view.totalPages > 1 && (
        <nav aria-label="Lead results pagination" className="flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={view.page <= 1}
            onClick={() => setPage(Math.max(1, view.page - 1))}
          >
            Previous
          </Button>
          <span className="text-sm text-slate-600">
            Page {view.page} of {view.totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={view.page >= view.totalPages}
            onClick={() => setPage(view.page + 1)}
          >
            Next
          </Button>
        </nav>
      )}
    </section>
  );
}
