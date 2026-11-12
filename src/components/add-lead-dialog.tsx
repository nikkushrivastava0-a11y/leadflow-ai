"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addLead } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus } from "lucide-react";

export function AddLeadDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    source: "manual",
    notes: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.email.trim() && !form.phone.trim()) {
      toast.error("Enter an email address or phone number.");
      return;
    }
    setLoading(true);

    try {
      const result = await addLead(form);

      if (result?.success === true) {
        toast.success("Lead added.");
        setForm({ name: "", email: "", phone: "", source: "manual", notes: "" });
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result?.error || "Lead creation was not confirmed.");
      }
    } catch {
      toast.error("Lead creation could not be confirmed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!loading) setOpen(nextOpen); }}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Lead
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Lead</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="John Doe"
              autoComplete="name"
              minLength={2}
              maxLength={100}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="john@example.com"
              autoComplete="email"
              aria-describedby="contact-help"
              maxLength={254}
            />
          </div>
          <p className="text-xs text-slate-600" id="contact-help">
            Provide at least one contact method: email or phone.
          </p>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+91 98765 43210"
              type="tel"
              autoComplete="tel"
              aria-describedby="contact-help"
              maxLength={25}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="source">Source</Label>
            <select
              id="source"
              value={form.source}
              onChange={(e) => setForm({ ...form, source: e.target.value })}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              <option value="manual">Manual</option>
              <option value="website">Website</option>
              <option value="referral">Referral</option>
              <option value="social">Social</option>
              <option value="email">Email</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Interested in premium plan..."
              maxLength={1000}
              aria-describedby="notes-limit"
              rows={3}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <p id="notes-limit" className="text-right text-xs text-slate-500">{form.notes.length}/1000 characters</p>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Lead"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}