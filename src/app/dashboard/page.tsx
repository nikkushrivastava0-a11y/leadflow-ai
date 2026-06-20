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

  if (!user?.email) {
    return <div className="p-8 text-center">Please log in to access dashboard.</div>;
  }

  // ==================== SECURITY FIX: CLIENT SLUG FETCH ====================
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('slug')
    .eq('owner_email', user.email)
    .single();

  if (clientError || !client?.slug) {
    console.error("Client not found:", clientError);
    return <div className="p-8 text-center text-red-600">Client profile not found. Make sure your email is in the 'clients' table.</div>;
  }

  // ==================== SECURITY FIX: FILTER LEADS BY SLUG ====================
  const { data: directLeads, error: leadsError } = await supabase
    .from('leads')
    .select('*')
    .eq('client_slug', client.slug) // <-- YE WALI LINE AB TUMHARA DATA SECURE KAREGI
    .order('created_at', { ascending: false });

  if (leadsError) {
    console.error("Leads fetch error:", leadsError);
  }

  const leads = (directLeads || []) as Lead[];

  // Stats
  const totalLeads = leads.length;
  const hotLeads = leads.filter((l) => (l.score || 0) >= 70).length;
  const wonLeads = leads.filter((l) => l.status === "won").length;

  const formLink = `https://leadflow-ai-flame.vercel.app/form/${client.slug}`;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between border-b bg-white px-6 py-4">
        <h1 className="text-xl font-bold">LeadFlow AI</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-500">{user.email}</span>
          <UpgradeButton />
          <LogoutButton />
        </div>
      </header>
      
      <main className="mx-auto max-w-7xl p-6 space-y-8">
        
        {/* === FORM LINK SECTION === */}
        <div className="bg-white p-5 rounded-xl border shadow-sm flex flex-col gap-2">
          <p className="text-sm text-slate-500 font-medium">Your Public Form Link (Share this with customers)</p>
          <code className="bg-slate-100 px-4 py-3 rounded font-mono text-indigo-600 text-sm break-all">
            {formLink}
          </code>
        </div>

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