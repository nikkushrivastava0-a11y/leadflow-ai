export const dynamic = "force-dynamic";

import { resolveOwnerScope, ownerScopeMessage } from "@/lib/server/owner-scope";
import { LogoutButton } from "@/components/logout-button";
import { AddLeadDialog } from "@/components/add-lead-dialog";
import { LeadsTable } from "@/components/leads-table";
import { UpgradeButton } from "@/components/upgrade-button";
import { Lead } from "@/lib/types";

export default async function DashboardPage() {
  const scope = await resolveOwnerScope();

  if (!scope.ok) {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-3 px-6">
        <h1 className="text-2xl font-semibold text-slate-900">Workspace access pending</h1>
        <p className="text-slate-700">{ownerScopeMessage(scope.reason)}</p>
        <p className="text-sm text-slate-500">
          A verified login is not the same as an approved business workspace.
          Your existing enquiries have not been deleted.
        </p>
      </main>
    );
  }

  const { data: directLeads, error: leadsError } = await scope.supabase
    .from("leads")
    .select("*")
    .or(
      `client_slug.eq.${scope.slug},and(client_slug.is.null,user_id.eq.${scope.userId})`
    )
    .order("created_at", { ascending: false });

  if (leadsError) {
    console.error("Owner dashboard load failed:", leadsError.code || "unknown");
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-3 px-6">
        <h1 className="text-2xl font-semibold text-slate-900">Leads unavailable</h1>
        <p className="text-slate-700">
          The dashboard cannot verify lead access right now. Please refresh or contact support.
        </p>
      </main>
    );
  }

  const leads = (directLeads || []) as Lead[];
  // Show one canonical link only. Its public write path intentionally fails
  // closed until approved Redis + secret configuration and RLS rollout exist.
  const formLink = `https://leadflow-ai-flame.vercel.app/form/${scope.slug}`;

  // Stats
  const totalLeads = leads.length;
  const hotLeads = leads.filter((l) => (l.score || 0) >= 70).length;
  const wonLeads = leads.filter((l) => l.status === "won").length;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between border-b bg-white px-6 py-4">
        <h1 className="text-xl font-bold">LeadFlow AI</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-500">{scope.email}</span>
          <UpgradeButton />
          <LogoutButton />
        </div>
      </header>
      
      <main className="mx-auto max-w-7xl p-6 space-y-8">
        
        {/* === FORM LINK SECTION === */}
        <div className="bg-white p-5 rounded-xl border shadow-sm flex flex-col gap-2">
          <p className="text-sm text-slate-500 font-medium">Business enquiry link — do not share before launch approval</p>
          <code className="bg-slate-100 px-4 py-3 rounded font-mono text-indigo-600 text-sm break-all">
            {formLink}
          </code>
          <p className="text-xs text-amber-800">Enquiry intake requires verified server security and is not yet ready for real customer submissions.</p>
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