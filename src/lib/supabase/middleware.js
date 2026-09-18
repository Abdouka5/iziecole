import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { getSubscriptionStatus } from "@/lib/subscription-status";
import { SCHOOL_COOKIE } from "@/lib/school-cookie";

// /api is here too: API routes authenticate themselves however fits (the
// PayTech IPN route verifies a signed payload, not a browser session) —
// redirecting an unauthenticated server-to-server caller to /login just
// silently breaks the webhook instead of ever reaching the route handler.
const PUBLIC_PATHS = ["/", "/login", "/superadminlogin", "/signup", "/auth", "/api"];

// Mirrors the (app) route group's pages that require a paid subscription.
// Kept in sync by hand with src/app/(app)/* — /settings and /support stay
// out of this list on purpose, so they're reachable even when blocked (a
// school_admin needs /settings to pay).
const PROTECTED_APP_PATHS = [
  "/dashboard",
  "/students",
  "/classes",
  "/grades",
  "/finance",
  "/schedule",
  "/personnel",
  "/users",
  "/documents",
  "/communication",
  "/caisse",
];

function isPublicPath(pathname) {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

function isProtectedAppPath(pathname) {
  return PROTECTED_APP_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

export async function updateSession(request) {
  // Forwarded so Server Components can read the current path via
  // headers() from next/headers — layouts don't otherwise get it, and
  // (app)/layout.js needs it to know whether it's on /settings (to skip
  // the "complete your school profile" banner there).
  request.headers.set("x-pathname", request.nextUrl.pathname);

  let response = NextResponse.next({ request });

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    // Supabase isn't configured yet (fresh clone, no .env.local) — let
    // requests through unauthenticated instead of 500ing on every route.
    // See .env.local.example.
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isPublicPath(request.nextUrl.pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = request.nextUrl.pathname.startsWith("/admin") ? "/superadminlogin" : "/login";
    return NextResponse.redirect(loginUrl);
  }

  // Enforced here, not just in (app)/layout.js: Next.js reuses that shared
  // layout's rendered output across client-side navigations between
  // sibling pages (e.g. /settings -> /dashboard), so a check that only
  // runs inside the layout can go stale and let a blocked school through
  // once it has rendered /settings (exempt) at least once. Middleware runs
  // on every request, including those soft navigations, so it can't be
  // bypassed that way.
  if (user && isProtectedAppPath(request.nextUrl.pathname)) {
    const schoolId = request.cookies.get(SCHOOL_COOKIE)?.value;
    if (schoolId) {
      // Run both round-trips concurrently — neither depends on the other,
      // and this runs on every protected navigation, so halving it from
      // two sequential hops to one matters.
      const [{ data: profile }, status] = await Promise.all([
        supabase.from("profiles").select("is_super_admin").eq("id", user.id).maybeSingle(),
        getSubscriptionStatus(supabase, schoolId),
      ]);

      if (!profile?.is_super_admin && !status.active) {
        const blockedUrl = request.nextUrl.clone();
        blockedUrl.pathname = "/subscription-blocked";
        blockedUrl.search = "";
        return NextResponse.redirect(blockedUrl);
      }
    }
  }

  return response;
}
