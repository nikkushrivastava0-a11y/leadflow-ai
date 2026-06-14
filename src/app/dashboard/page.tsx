export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/logout-button";
import { AddLeadDialog } from "@/components/add-lead-dialog";
import { LeadsTable } from "@/components/leads-table";
import { UpgradeButton } from "@/components/upgrade-button";
import { Lead } from "@/lib/types";

export default async function DashboardPage() {
  const supabase = await createClient();
  
  // 1. Logged-in user ka data
  const { data: { user } } = await supabase.auth.getUser();

  // 2. DIRECT DATABASE FETCH (Filter hata diya hai taaki saari leads dikhen)
  const { data: directLeads, error } = await supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false }); 
    
  if (error) {
    console.error("DASHBOARD FETCH ERROR:", error);
  }

  const leads = (directLeads || []) as Lead[];
  
  // Stats
  const totalLeads = leads.length;
  const hotLeads = leads.filter((l) => l.score >= 70).length;
  const wonLeads = leads.filter((l) => l.status === "won").length;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between border-b bg-white px-6 py-4">
        <h1 className="text-xl font-bold">LeadFlow AI</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-500">{user?.email}</span>
          <UpgradeButton />
          <LogoutButton />
        </div>
      </header>
      
      <main className="mx-auto max-w-7xl p-6 space-y-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h3 className="text-sm font-medium text-slate-500">Total Leads</h3>
            <p className="mt-2 text-3xl font-bold">{totalLeads}</p>
          </div>
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h3 className="text-sm font-medium text-slate-500">Hot Leads (70+)</h3>
            <p className="mt-2 text-3xl font-bold text-green-600">{hotLeads}</p>
          </div>
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h3 className="text-sm font-medium text-slate-500">Won</h3>
            <p className="mt-2 text-3xl font-bold text-indigo-600">{wonLeads}</p>
          </div>
        </div>

        {/* Table Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Your Leads</h2>
            <AddLeadDialog />
          </div>
          <LeadsTable leads={leads} />
        </div>
      </main>
    </div>
  );
}