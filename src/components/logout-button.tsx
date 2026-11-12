"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  async function handleLogout() {
    if (loading) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast.error("Sign-out could not be confirmed. Please try again.");
        return;
      }
      router.replace("/login");
      router.refresh();
    } catch {
      toast.error("Sign-out could not be confirmed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="outline" size="sm" disabled={loading} onClick={handleLogout}>
      {loading ? "Signing out…" : "Logout"}
    </Button>
  );
}