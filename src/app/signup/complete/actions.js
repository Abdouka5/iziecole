"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureDefaultSubjects, ensureDefaultLevels } from "@/lib/school-defaults";
import { slugify, uniqueSlug } from "@/lib/school-slug";
import { SCHOOL_COOKIE } from "@/lib/school-context";

// Finishes provisioning for a Google account that had no membership yet
// (see /auth/callback) — the user is already authenticated, so this only
// needs the school name, not another email/password.
export async function completeGoogleSignup(formData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: existing } = await supabase
    .from("memberships")
    .select("school_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (existing) redirect("/dashboard");

  const schoolName = formData.get("schoolName")?.toString().trim();
  const phoneLocal = formData.get("phoneLocal")?.toString().trim();

  if (!schoolName) {
    redirect(`/signup/complete?error=${encodeURIComponent("Le nom de l'établissement est obligatoire.")}`);
  }

  const phone = phoneLocal ? `+221${phoneLocal.replace(/\D/g, "")}` : null;

  const admin = createAdminClient();
  const slug = await uniqueSlug(admin, slugify(schoolName));

  const { data: school, error: schoolError } = await admin
    .from("schools")
    .insert({ name: schoolName, slug, phone })
    .select("id")
    .single();

  if (schoolError) {
    redirect(`/signup/complete?error=${encodeURIComponent(schoolError.message)}`);
  }

  const { error: membershipError } = await admin.from("memberships").insert({
    user_id: user.id,
    school_id: school.id,
    role: "school_admin",
  });

  if (membershipError) {
    redirect(`/signup/complete?error=${encodeURIComponent(membershipError.message)}`);
  }

  if (phone) {
    await admin.from("profiles").update({ phone }).eq("id", user.id);
  }

  await Promise.all([
    ensureDefaultSubjects(admin, school.id),
    ensureDefaultLevels(admin, school.id),
  ]);

  const cookieStore = await cookies();
  cookieStore.set(SCHOOL_COOKIE, school.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  redirect("/dashboard");
}
