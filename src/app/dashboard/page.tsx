import { createClient } from "@/lib/supabase/server";
import { getLeads } from "@/lib/actions";
import { LogoutButton } from "@/components/logout-button";
import { AddLeadDialog } from "@/components/add-lead-dialog";
import { LeadsTable } from "@/components/leads-table";
import { Lead } from "@/lib/types";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const leads = (await getLeads()) as Lead[];

  // Quick stats
  const totalLeads = leads.length;
  const hotLeads = leads.filter((l) => l.score >= 70).length;
  const wonLeads = leads.filter((l) => l.status === "won").length;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between border-b bg-white px-6 py-4">
        <h1 className="text-xl font-bold">LeadFlow AI</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-600">{user?.email}</span>
          <LogoutButton />
        </div>
      </header>

      <main className="mx-auto max-w-6xl p-6">
        {/* Stats cards */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg border bg-white p-4">
            <p className="text-sm text-slate-500">Total Leads</p>
            <p className="text-2xl font-bold">{totalLeads}</p>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <p className="text-sm text-slate-500">Hot Leads (70+)</p>
            <p className="text-2xl font-bold text-green-600">{hotLeads}</p>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <p className="text-sm text-slate-500">Won</p>
            <p className="text-2xl font-bold text-indigo-600">{wonLeads}</p>
          </div>
        </div>

        {/* Header + Add button */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold">Your Leads</h2>
          <AddLeadDialog />
        </div>

        {/* Leads table */}
        <LeadsTable leads={leads} />
      </main>
    </div>
  );
}