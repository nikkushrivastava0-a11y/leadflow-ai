import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
          Object.entries(headers).forEach(([name, value]) => response.headers.set(name, value));
        },
      },
    }
  );

  let authenticated = false;
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    authenticated = !error && Boolean(user?.id && user.email_confirmed_at);
  } catch {
    // A network/auth failure must never grant access or expose raw token errors.
  }

  function redirectWithSession(pathname: string) {
    const redirect = NextResponse.redirect(new URL(pathname, request.url));
    response.cookies.getAll().forEach(cookie => redirect.cookies.set(cookie));
    // Redirects must preserve refreshed/cleared cookies and cannot be cached.
    redirect.headers.set("Cache-Control", "private, no-store");
    redirect.headers.set("Pragma", "no-cache");
    redirect.headers.set("Expires", "0");
    return redirect;
  }

  const path = request.nextUrl.pathname;
  const isAuthPage = path.startsWith("/login");
  const isProtected = path.startsWith("/dashboard");

  // Not logged in + trying to access dashboard → redirect to login
  if (isProtected && !authenticated) {
    return redirectWithSession("/login");
  }

  // Logged in + on login page → redirect to dashboard
  if (isAuthPage && authenticated) {
    return redirectWithSession("/dashboard");
  }

  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
};