"use server";

import { revalidatePath } from "next/cache";
import { scoreLead } from "@/lib/gemini";
import { buildTenantLeadFilter } from "@/lib/dashboard-query";
import { validateFollowUp } from "@/lib/follow-up";
import { resolveOwnerScope, ownerScopeMessage } from "@/lib/server/owner-scope";
import {
  validLeadId,
  validLeadStatus,
  validateManualLead,
} from "@/lib/manual-lead-validation";

type NewLead = {
  name: string;
  email: string;
  phone: string;
  source: string;
  notes: string;
};

/**
 * All owner actions use the same immutable owner_user_id -> business slug
 * lookup. The caller's chosen slug, email or metadata never decides tenancy.
 * Actual enforcement remains the database's Auth-linked RLS policies.
 */
export async function getLeads() {
  const scope = await resolveOwnerScope();
  if (!scope.ok) return [];

  const { data, error } = await scope.supabase
    .from("leads")
    .select("*")
    .or(buildTenantLeadFilter(scope.slug, scope.userId, ""))
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Owner lead listing failed:", error.code || "unknown");
    throw new Error("Lead listing is unavailable. Please retry.");
  }

  return data || [];
}

export async function addLead(input: NewLead) {
  const validated = validateManualLead(input);
  if (!validated.ok) return { error: validated.reason };

  const scope = await resolveOwnerScope();
  if (!scope.ok) return { error: ownerScopeMessage(scope.reason) };

  const value = validated.value;
  // scoreLead only sends local, allowlisted intent booleans to Gemini.
  const { score, reason } = await scoreLead({
    name: value.name,
    email: value.email || "",
    phone: value.phone || "",
    source: value.source,
    notes: value.notes || "",
  });

  const { data, error } = await scope.supabase.from("leads").insert({
    user_id: scope.userId,
    client_slug: scope.slug,
    name: value.name,
    email: value.email,
    phone: value.phone,
    source: value.source,
    notes: value.notes,
    status: "new",
    score,
    score_reason: reason,
  }).select("id").maybeSingle();

  if (error || !data?.id) {
    if (error) console.error("Manual lead create failed:", error.code || "unknown");
    return { error: "Lead creation could not be confirmed." };
  }

  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteLead(id: string) {
  if (!validLeadId(id)) return { error: "Invalid lead selection." };

  const scope = await resolveOwnerScope();
  if (!scope.ok) return { error: ownerScopeMessage(scope.reason) };

  // Null user_id public leads belong to the *business*, not a user_id.
  // RLS must check authenticated ownership through clients.owner_user_id.
  const { data, error } = await scope.supabase
    .from("leads")
    .delete()
    .eq("id", id)
    .or(buildTenantLeadFilter(scope.slug, scope.userId, ""))
    .select("id");

  if (error || !data || data.length !== 1 || data[0]?.id !== id) {
    if (error) console.error("Owner lead delete failed:", error.code || "unknown");
    return { error: "Lead deletion was not confirmed. Refresh and check access." };
  }

  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateLeadStatus(id: string, status: string) {
  if (!validLeadId(id)) return { error: "Invalid lead selection." };
  if (!validLeadStatus(status)) return { error: "Invalid lead status." };

  const scope = await resolveOwnerScope();
  if (!scope.ok) return { error: ownerScopeMessage(scope.reason) };

  const { data, error } = await scope.supabase
    .from("leads")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .or(buildTenantLeadFilter(scope.slug, scope.userId, ""))
    .select("id")
    .maybeSingle();

  if (error || data?.id !== id) {
    if (error) console.error("Owner lead status update failed:", error.code || "unknown");
    return { error: "Lead status change was not confirmed." };
  }

  revalidatePath("/dashboard");
  return { success: true };
}


export async function updateLeadFollowUp(id: string, value: string | null) {
  if (!validLeadId(id)) return { error: "Invalid lead selection." };
  const validated = validateFollowUp(value);
  if (!validated.ok) return { error: validated.reason };

  const scope = await resolveOwnerScope();
  if (!scope.ok) return { error: ownerScopeMessage(scope.reason) };

  const { data, error } = await scope.supabase
    .from("leads")
    .update({ next_follow_up_at: validated.value, updated_at: new Date().toISOString() })
    .eq("id", id)
    .or(buildTenantLeadFilter(scope.slug, scope.userId, ""))
    .select("id")
    .maybeSingle();

  if (error || data?.id !== id) {
    if (error) console.error("Owner follow-up update failed:", error.code || "unknown");
    return { error: "Follow-up change was not confirmed. Refresh and check access." };
  }

  revalidatePath("/dashboard");
  return { success: true };
}
