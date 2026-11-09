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
      if (result?.error) {
        setStatus(previousStatus);
        toast.error(result.error);
        return;
      }
      toast.success("Lead status updated");
      router.refresh();
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

export function LeadsTable({ leads }: { leads: Lead[] }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  return (
    <div className="rounded-lg border bg-white">
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
          {leads.map((lead) => (
            <TableRow key={lead.id}>
              <TableCell className="font-medium">{lead.name}</TableCell>
              <TableCell>{lead.email || "—"}</TableCell>
              <TableCell>{lead.phone || "—"}</TableCell>
              <TableCell className="capitalize">{lead.source}</TableCell>
              <TableCell>
                <LeadStatusSelect lead={lead} />
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
  );
}