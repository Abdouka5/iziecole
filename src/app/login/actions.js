"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SCHOOL_COOKIE } from "@/lib/school-context";
import { ROLE_HOME_PATH } from "@/lib/roles";

export async function signIn(formData) {
  const email = formData.get("email");
  const password = formData.get("password");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  const userId = data.user.id;

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_super_admin")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.is_super_admin) {
    redirect("/admin");
  }

  // Most accounts belong to exactly one school — skip the picker and go
  // straight in. A user with more than one membership (rare: e.g. a
  // teacher at one school who's also a parent at another) lands on their
  // first one and can still switch from the header's "Changer
  // d'établissement" menu.
  const { data: membership } = await supabase
    .from("memberships")
    .select("school_id, role")
    .eq("user_id", userId)
    .eq("suspended", false)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!membership) {
    redirect(`/login?error=${encodeURIComponent("Aucun établissement n'est associé à ce compte. Contactez votre direction.")}`);
  }

  const cookieStore = await cookies();
  cookieStore.set(SCHOOL_COOKIE, membership.school_id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  redirect(ROLE_HOME_PATH[membership.role] ?? "/dashboard");
}
