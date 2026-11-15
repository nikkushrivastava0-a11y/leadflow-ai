"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lead, LEAD_STATUSES } from "@/lib/types";
import { deleteLead, updateLeadStatus } from "@/lib/actions";
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
import { LeadFollowUp } from "@/components/lead-follow-up";
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


function LeadStatusSelect({ lead }: { lead: Lead }) {
  const router = useRouter();
  const [status, setStatus] = useState(lead.status);
  const [saving, setSaving] = useState(false);

  async function changeStatus(nextStatus: string) {
    if (saving || nextStatus === status) return;
    const previousStatus = status;
    setStatus(nextStatus);
    setSaving(true);

    try {
      const result = await updateLeadStatus(lead.id, nextStatus);
      if (result?.success === true) {
        toast.success("Lead status updated");
        router.refresh();
      } else {
        setStatus(previousStatus);
        toast.error(result?.error || "Status update could not be confirmed.");
      }
    } catch {
      setStatus(previousStatus);
      toast.error("Could not update lead. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <label className="inline-flex items-center gap-2">
      <span className="sr-only">Status for {lead.name}</span>
      <select
        value={status}
        onChange={(event) => void changeStatus(event.target.value)}
        disabled={saving}
        aria-label={`Status for ${lead.name}`}
        className={`rounded-md border border-slate-200 px-2 py-1.5 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-60 ${statusColor(status)}`}
      >
        {LEAD_STATUSES.map((option) => (
          <option key={option} value={option}>
            {option.charAt(0).toUpperCase() + option.slice(1)}
          </option>
        ))}
      </select>
      {saving ? <span className="text-[10px] text-slate-500">Saving…</span> : null}
    </label>
  );
}

export function LeadsTable({ leads, page, totalPages, totalLeads, matchingLeads, query, status }: {
  leads: Lead[]; page: number; totalPages: number; totalLeads: number;
  matchingLeads: number; query: string; status: string;
}) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const pageSize = 20;
  const isFiltered = Boolean(query) || status !== "all";
  function navigatePage(next: number) {
    if (next < 1 || next > totalPages) return;
    const params = new URLSearchParams();
    params.set("page", String(next));
    if (query) params.set("q", query);
    if (status !== "all") params.set("status", status);
    router.push(`/dashboard?${params.toString()}`);
  }
  const visible = leads;

  async function handleDelete(id: string, name: string) {
    if (deletingId || !window.confirm(`Permanently delete ${name}'s lead? This cannot be undone.`)) return;

    setDeletingId(id);
    try {
      const result = await deleteLead(id);
      if (result?.success === true) {
        toast.success("Lead deleted");
        router.refresh();
      } else {
        toast.error(result?.error || "Deletion could not be confirmed.");
      }
    } catch {
      toast.error("Deletion could not be confirmed. Please retry.");
    } finally {
      setDeletingId(null);
    }
  }

  if (totalLeads === 0) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center">
        <p className="text-slate-500">No leads yet.</p>
        <p className="text-sm text-slate-400">
          Click &quot;Add Lead&quot; to create your first one.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-white">
      <form action="/dashboard" method="get" className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-end sm:justify-between">
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Search all leads
          <input type="search" name="q" defaultValue={query} maxLength={80}
            placeholder="Name, email, phone or source"
            className="w-full rounded-md border border-slate-300 px-3 py-2 font-normal sm:w-72" />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Status
          <select name="status" defaultValue={status}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 font-normal">
            <option value="all">All statuses</option>
            {LEAD_STATUSES.map((option) => (
              <option key={option} value={option}>{option.charAt(0).toUpperCase() + option.slice(1)}</option>
            ))}
          </select>
        </label>
        <div className="flex items-center gap-2">
          <Button type="submit" size="sm">Search</Button>
          {isFiltered ? <Button type="button" variant="outline" size="sm" onClick={() => router.push("/dashboard")}>Clear filters</Button> : null}
        </div>
      </form>
      <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Score</TableHead>
            <TableHead>Next follow-up</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visible.map((lead) => (
            <TableRow key={lead.id}>
              <TableCell className="font-medium">{lead.name}</TableCell>
              <TableCell>{lead.email || "—"}</TableCell>
              <TableCell>{lead.phone || "—"}</TableCell>
              <TableCell className="capitalize">{lead.source}</TableCell>
              <TableCell>
                <LeadStatusSelect key={`${lead.id}:${lead.status}`} lead={lead} />
              </TableCell>
              <TableCell>
                <Badge variant="secondary" className={scoreColor(lead.score)}>
                  {lead.score}
                </Badge>
                <p className="mt-1 max-w-48 whitespace-normal text-xs text-slate-500">
                  {lead.score_reason || "No scoring explanation recorded. This score is not verified AI analysis."}
                </p>
              </TableCell>
              <TableCell>
                <LeadFollowUp key={`${lead.id}:${lead.next_follow_up_at || "none"}`} id={lead.id} name={lead.name} value={lead.next_follow_up_at} />
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(lead.id, lead.name)}
                  aria-label={`Delete lead ${lead.name}`}
                  disabled={deletingId !== null}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </div>
      {matchingLeads === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-slate-600" role="status">
          No leads match your search or status filter.
        </p>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm text-slate-600">
        <span role="status">
          Showing {matchingLeads === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, matchingLeads)} of {matchingLeads} matching leads{isFiltered ? ` (${totalLeads} total)` : ""}
        </span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => navigatePage(page - 1)}>Previous</Button>
          <span aria-label="Current page">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => navigatePage(page + 1)}>Next</Button>
        </div>
      </div>
    </div>
  );
}