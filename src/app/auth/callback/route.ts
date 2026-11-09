import { createClient } from "@/lib/supabase/server";
import { callbackRedirectUrl, extractPkceCode } from "@/lib/auth-callback-origin";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const config = {
    callbackOrigin: process.env.AUTH_CALLBACK_ORIGIN,
    vercelUrl: process.env.VERCEL_URL,
    environment: process.env.NODE_ENV,
  };

  const code = extractPkceCode(request.url);
  let success = false;

  if (code) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      success = !error && Boolean(data?.session && data?.user);
    } catch {
      // Do not log tokens, one-time PKCE codes, request URLs or raw auth errors.
      success = false;
    }
  }

  const destination = callbackRedirectUrl(request.url, success, config);
  const response = NextResponse.redirect(destination, { status: 303 });

  // An auth callback should not be cached or leak its URL to another origin.
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
