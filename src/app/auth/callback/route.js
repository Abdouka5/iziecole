import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SCHOOL_COOKIE } from "@/lib/school-context";
import { ROLE_HOME_PATH } from "@/lib/roles";

// Handles both a Supabase email link (confirmation, magic link, password
// reset) and a Google OAuth redirect — same code-exchange step either way.
// A Google account with no existing membership is brand new to iziecole,
// so it's routed to finish creating its school instead of erroring out.
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data?.user) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent("Connexion impossible, réessayez.")}`,
    );
  }

  const userId = data.user.id;

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_super_admin")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.is_super_admin) {
    return NextResponse.redirect(`${origin}/admin`);
  }

  const { data: membership } = await supabase
    .from("memberships")
    .select("school_id, role")
    .eq("user_id", userId)
    .eq("suspended", false)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!membership) {
    return NextResponse.redirect(`${origin}/signup/complete`);
  }

  const cookieStore = await cookies();
  cookieStore.set(SCHOOL_COOKIE, membership.school_id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return NextResponse.redirect(`${origin}${ROLE_HOME_PATH[membership.role] ?? "/dashboard"}`);
}
