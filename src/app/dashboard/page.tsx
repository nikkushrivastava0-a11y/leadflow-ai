export const dynamic = "force-dynamic";

import { resolveOwnerScope, ownerScopeMessage } from "@/lib/server/owner-scope";
import { LogoutButton } from "@/components/logout-button";
import { AddLeadDialog } from "@/components/add-lead-dialog";
import { LeadsTable } from "@/components/leads-table";
import { UpgradeButton } from "@/components/upgrade-button";
import { Lead } from "@/lib/types";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const requestedPage = typeof params.page === "string" && /^[1-9]\\d{0,5}$/.test(params.page)
    ? Number(params.page) : 1;
  const pageSize = 20;
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

  // Exact database counts avoid reporting a truncated PostgREST page as totals.
  const ownerFilter = `client_slug.eq.${scope.slug},and(client_slug.is.null,user_id.eq.${scope.userId})`;
  const [totalResult, hotResult, wonResult] = await Promise.all([
    scope.supabase.from("leads").select("id", { count: "exact", head: true }).or(ownerFilter),
    scope.supabase.from("leads").select("id", { count: "exact", head: true }).or(ownerFilter).gte("score", 70),
    scope.supabase.from("leads").select("id", { count: "exact", head: true }).or(ownerFilter).eq("status", "won"),
  ]);

  const totalPages = Math.max(1, Math.ceil((totalResult.count ?? 0) / pageSize));
  const currentPage = Math.min(requestedPage, totalPages);
  const { data: directLeads, error: leadsError } = await scope.supabase
    .from("leads")
    .select("*")
    .or(
      `client_slug.eq.${scope.slug},and(client_slug.is.null,user_id.eq.${scope.userId})`
    )
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range((currentPage - 1) * pageSize, currentPage * pageSize - 1);

  if (leadsError || totalResult.error || hotResult.error || wonResult.error) {
    console.error("Owner dashboard load failed:", leadsError?.code || totalResult.error?.code || hotResult.error?.code || wonResult.error?.code || "unknown");
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
  // Never display a guessed deployment URL as a customer-ready enquiry link.
  // The canonical origin must be explicitly approved in server configuration.
  const configuredOrigin = process.env.LEADFLOW_PUBLIC_ORIGIN;
  let formLink: string | null = null;
  if (configuredOrigin) {
    try {
      const parsed = new URL(configuredOrigin);
      if (
        parsed.protocol === "https:" &&
        parsed.pathname === "/" &&
        !parsed.username && !parsed.password &&
        !parsed.search && !parsed.hash &&
        !parsed.port
      ) {
        formLink = new URL(`/form/${scope.slug}`, parsed.origin).toString();
      }
    } catch {
      // Invalid or missing configuration must never produce a shareable link.
    }
  }

  // Stats
  const totalLeads = totalResult.count ?? 0;
  const hotLeads = hotResult.count ?? 0;
  const wonLeads = wonResult.count ?? 0;

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
          {formLink ? (
            <code className="bg-slate-100 px-4 py-3 rounded font-mono text-indigo-600 text-sm break-all">
              {formLink}
            </code>
          ) : (
            <p className="rounded bg-amber-50 px-4 py-3 text-sm text-amber-900" role="status">
              Enquiry link unavailable: the approved public domain has not been configured.
            </p>
          )}
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
          <LeadsTable leads={leads} page={currentPage} totalPages={totalPages} totalLeads={totalLeads} />
        </div>
      </main>
    </div>
  );
}