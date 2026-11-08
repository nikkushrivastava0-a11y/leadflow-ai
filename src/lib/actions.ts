"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { scoreLead } from "@/lib/gemini";
import { LEAD_STATUSES } from "@/lib/types";

/**
 * Keep this ownership lookup consistent with dashboard/page.tsx until a
 * verified immutable clients.owner_user_id migration has been completed.
 *
 * IMPORTANT: RLS still has to be verified separately against two owners.
 * Server-side query filters are not a substitute for Postgres RLS.
 */
async function getOwnerSlug(
  supabase: Awaited<ReturnType<typeof createClient>>,
  email: string | undefined
): Promise<string | null> {
  if (!email) return null;

  const { data, error } = await supabase
    .from("clients")
    .select("slug")
    .eq("owner_email", email)
    .single();

  if (error || !data?.slug) {
    console.error("Client profile could not be resolved");
    return null;
  }

  return data.slug;
}

export async function getLeads() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const slug = await getOwnerSlug(supabase, user.email);
  if (!slug) return [];

  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("client_slug", slug)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching leads:", error);
    return [];
  }

  return data;
}

export async function addLead(formData: {
  name: string;
  email: string;
  phone: string;
  source: string;
  notes: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const slug = await getOwnerSlug(supabase, user.email);
  if (!slug) return { error: "Client profile missing. Please contact support." };

  const name = formData.name?.trim();
  if (!name || name.length > 100) {
    return { error: "Name must be between 1 and 100 characters." };
  }

  const { score, reason } = await scoreLead({
    name,
    email: formData.email,
    phone: formData.phone,
    source: formData.source,
    notes: formData.notes,
  });

  const { error } = await supabase.from("leads").insert({
    user_id: user.id,
    client_slug: slug,
    name,
    email: formData.email || null,
    phone: formData.phone || null,
    source: formData.source || "manual",
    notes: formData.notes || null,
    status: "new",
    score,
    score_reason: reason,
  });

  if (error) {
    console.error("Error adding lead:", error);
    return { error: "Could not save lead." };
  }

  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteLead(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const slug = await getOwnerSlug(supabase, user.email);
  if (!slug) return { error: "Client profile missing." };

  const { data, error } = await supabase
    .from("leads")
    .delete()
    .eq("id", id)
    .eq("client_slug", slug)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Error deleting lead:", error);
    return { error: "Could not delete lead." };
  }

  if (!data) return { error: "Lead not found or not accessible." };

  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateLeadStatus(id: string, status: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  if (!LEAD_STATUSES.some((allowed) => allowed === status)) {
    return { error: "Invalid lead status." };
  }

  const slug = await getOwnerSlug(supabase, user.email);
  if (!slug) return { error: "Client profile missing." };

  const { data, error } = await supabase
    .from("leads")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("client_slug", slug)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Error updating lead:", error);
    return { error: "Could not update lead." };
  }

  if (!data) return { error: "Lead not found or not accessible." };

  revalidatePath("/dashboard");
  return { success: true };
}
