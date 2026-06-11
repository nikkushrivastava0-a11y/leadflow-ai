import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/logout-button";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between border-b bg-white px-6 py-4">
        <h1 className="text-xl font-bold">LeadFlow AI</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-600">{user?.email}</span>
          <LogoutButton />
        </div>
      </header>

      <main className="p-6">
        <h2 className="text-2xl font-bold mb-2">Dashboard</h2>
        <p className="text-slate-500">
          Welcome 🎉 You are logged in. We&apos;ll add leads & analytics next.
        </p>
      </main>
    </div>
  );
}