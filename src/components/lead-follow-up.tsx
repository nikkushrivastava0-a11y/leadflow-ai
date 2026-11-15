"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateLeadFollowUp } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

function localInputValue(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function utcLabel(value: string | null | undefined) {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toISOString().slice(0, 16).replace("T", " ") + " UTC"
    : "Date unavailable";
}

export function LeadFollowUp({ id, name, value }: {
  id: string; name: string; value: string | null | undefined;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  async function save(clear = false) {
    if (saving) return;
    const date = new Date(draft);
    if (!clear && (!draft || !Number.isFinite(date.getTime()))) {
      toast.error("Choose a valid follow-up date and time.");
      return;
    }
    setSaving(true);
    try {
      const result = await updateLeadFollowUp(id, clear ? null : date.toISOString());
      if (result?.success === true) {
        toast.success(clear ? "Follow-up cleared" : "Follow-up saved");
        setEditing(false);
        router.refresh();
      } else {
        toast.error(result?.error || "Follow-up change was not confirmed.");
      }
    } catch {
      toast.error("Follow-up change was not confirmed. Please retry.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-w-44 space-y-2">
      <p className="text-xs text-slate-600">{utcLabel(value)}</p>
      {editing ? (
        <div className="space-y-2">
          <label className="flex flex-col gap-1 text-xs text-slate-600">
            Date and time in your timezone
            <input type="datetime-local" value={draft} disabled={saving}
              aria-label={`Follow-up date and time for ${name}`}
              onChange={(event) => setDraft(event.target.value)}
              className="rounded-md border border-slate-300 px-2 py-1.5" />
          </label>
          <div className="flex flex-wrap gap-1">
            <Button type="button" size="sm" disabled={saving} onClick={() => void save()}>Save</Button>
            {value ? <Button type="button" size="sm" variant="outline" disabled={saving} onClick={() => void save(true)}>Clear</Button> : null}
            <Button type="button" size="sm" variant="ghost" disabled={saving} onClick={() => setEditing(false)}>Cancel</Button>
          </div>
          <p className="text-xs text-slate-500">Saves to your dashboard. No automatic message is sent.</p>
        </div>
      ) : (
        <Button type="button" size="sm" variant="outline"
          aria-label={`Schedule follow-up for ${name}`}
          onClick={() => { setDraft(localInputValue(value)); setEditing(true); }}>
          {value ? "Change" : "Schedule"}
        </Button>
      )}
    </div>
  );
}
