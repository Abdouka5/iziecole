"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureDefaultSubjects, ensureDefaultLevels } from "@/lib/school-defaults";
import { slugify, uniqueSlug } from "@/lib/school-slug";

export async function signUpSchool(formData) {
  const schoolName = formData.get("schoolName")?.toString().trim();
  const email = formData.get("email")?.toString().trim();
  const phoneLocal = formData.get("phoneLocal")?.toString().trim();
  const password = formData.get("password")?.toString();

  if (!schoolName || !email || !password) {
    redirect(`/signup?error=${encodeURIComponent("Merci de remplir tous les champs.")}`);
  }

  const phone = phoneLocal ? `+221${phoneLocal.replace(/\D/g, "")}` : null;

  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });

  if (authError) {
    redirect(`/signup?error=${encodeURIComponent(authError.message)}`);
  }

  const userId = authData.user?.id;
  if (!userId) {
    redirect(`/signup?error=${encodeURIComponent("Impossible de créer le compte, réessayez.")}`);
  }

  // Bootstrapping a school + its first admin membership needs to bypass RLS:
  // a brand-new user has no membership yet, so the normal "school_admin can
  // manage memberships in their school" policy can't apply to their own
  // very first row. Service-role is the trusted, narrow escape hatch here.
  const admin = createAdminClient();
  const slug = await uniqueSlug(admin, slugify(schoolName));

  const { data: school, error: schoolError } = await admin
    .from("schools")
    .insert({ name: schoolName, slug, phone })
    .select("id")
    .single();

  if (schoolError) {
    redirect(`/signup?error=${encodeURIComponent(schoolError.message)}`);
  }

  const { error: membershipError } = await admin.from("memberships").insert({
    user_id: userId,
    school_id: school.id,
    role: "school_admin",
  });

  if (membershipError) {
    redirect(`/signup?error=${encodeURIComponent(membershipError.message)}`);
  }

  if (phone) {
    await admin.from("profiles").update({ phone }).eq("id", userId);
  }

  await Promise.all([
    ensureDefaultSubjects(admin, school.id),
    ensureDefaultLevels(admin, school.id),
  ]);

  if (authData.session) {
    redirect("/select-school");
  }

  redirect(
    `/login?error=${encodeURIComponent("Compte créé. Vérifiez votre e-mail pour confirmer, puis connectez-vous.")}`,
  );
}
