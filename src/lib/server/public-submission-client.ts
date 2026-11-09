import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Elevated key isolation for the anonymous enquiry SERVER ACTION only.
 *
 * This client bypasses RLS. Never export it to Client Components, never store
 * it globally alongside browser/session clients, and never pass user JWTs,
 * cookies, or arbitrary table names to it.
 *
 * Use only after strict validated input, a verified business slug and a
 * durable shared rate-limit/duplicate guard. The key is a server-only secret,
 * not a NEXT_PUBLIC_ env variable.
 *
 * Supabase (2026) recommends sb_secret_* instead of legacy service_role keys:
 * https://supabase.com/docs/guides/getting-started/api-keys
 */
export function createPublicSubmissionClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;

  if (
    !url ||
    !secret ||
    !secret.startsWith("sb_secret_") ||
    secret.length < 24
  ) {
    return null;
  }

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" ||
        !parsed.hostname.endsWith(".supabase.co") ||
        parsed.username || parsed.password || parsed.search || parsed.hash ||
        parsed.pathname !== "/") {
      return null;
    }

    // Deliberately never use the cookie-aware Supabase SSR client here:
    // mixing a user session into the admin client can change its role.
    return createSupabaseClient(parsed.origin, secret, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  } catch {
    return null;
  }
}
