"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { scoreLead } from "@/lib/gemini";
import { isValidLeadId, verifyLeadDeletion } from "@/lib/lead-delete-guard";

export async function getLeads() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("user_id", user.id)
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

  // Get AI score from Gemini
  const { score, reason } = await scoreLead({
    name: formData.name,
    email: formData.email,
    phone: formData.phone,
    source: formData.source,
    notes: formData.notes,
  });

  const { error } = await supabase.from("leads").insert({
    user_id: user.id,
    name: formData.name,
    email: formData.email || null,
    phone: formData.phone || null,
    source: formData.source || "manual",
    notes: formData.notes || null,
    status: "new",
    score: score,
    score_reason: reason,
  });

  if (error) {
    console.error("Error adding lead:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteLead(id: string) {
  if (!isValidLeadId(id)) return { error: "Invalid lead selection." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // Keep owner UUID filter as an additional gate to the live RLS policy.
  // Never interpret a zero-row delete as success: RLS may block writes
  // without surfacing a database error.
  const { data: deletedRows, error } = await supabase
    .from("leads")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id");

  const result = verifyLeadDeletion(id, deletedRows, error);
  if (!result.confirmed) {
    if (error) {
      console.error("Lead deletion failed:", error.code || "database_error");
    }
    return { error: result.message };
  }

  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateLeadStatus(id: string, status: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("leads")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  return { success: true };
}