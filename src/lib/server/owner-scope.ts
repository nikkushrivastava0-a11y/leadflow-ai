import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isValidBusinessSlug } from "@/lib/public-leads";

type OwnerClient = Awaited<ReturnType<typeof createClient>>;

export type OwnerScope =
  | { ok: true; supabase: OwnerClient; userId: string; slug: string }
  | { ok: false; reason: "not_authenticated" | "business_unavailable" };

/**
 * One source of truth for ALL authenticated CRM operations. The required
 * clients.owner_user_id column is introduced by the reviewed RLS migration.
 * Do not silently fall back to owner_email or use an elevated client here.
 */
export async function resolveOwnerScope(): Promise<OwnerScope> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user?.id || !user.email_confirmed_at) {
    return { ok: false, reason: "not_authenticated" };
  }

  const { data: business, error } = await supabase
    .from("clients")
    .select("slug")
    .eq("owner_user_id", user.id)
    .maybeSingle();

  if (error || !business?.slug || !isValidBusinessSlug(business.slug)) {
    // Never log the owner's email, access token or business slug.
    return { ok: false, reason: "business_unavailable" };
  }

  return { ok: true, supabase, userId: user.id, slug: business.slug };
}

export function ownerScopeMessage(reason: OwnerScope extends never ? never : "not_authenticated" | "business_unavailable") {
  return reason === "not_authenticated"
    ? "Please sign in with a verified account."
    : "Business setup or access verification is pending. Please contact support.";
}
