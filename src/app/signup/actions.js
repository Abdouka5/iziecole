"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PLAN_LABELS } from "@/lib/subscription-plans";

function slugify(name) {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function uniqueSlug(admin, baseSlug) {
  let slug = baseSlug || "ecole";
  let suffix = 1;
  // Bootstrap-only lookup: RLS normally hides other schools from a
  // brand-new user, so this needs the service-role client.
  while (true) {
    const { data } = await admin.from("schools").select("id").eq("slug", slug).maybeSingle();
    if (!data) return slug;
    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
  }
}

export async function signUpSchool(formData) {
  const schoolName = formData.get("schoolName")?.toString().trim();
  const plan = formData.get("plan")?.toString();
  const email = formData.get("email")?.toString().trim();
  const phoneLocal = formData.get("phoneLocal")?.toString().trim();
  const password = formData.get("password")?.toString();

  if (!schoolName || !plan || !PLAN_LABELS[plan] || !email || !password) {
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
    .insert({ name: schoolName, slug, subscription_plan: plan, phone })
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

  if (authData.session) {
    redirect("/select-school");
  }

  redirect(
    `/login?error=${encodeURIComponent("Compte créé. Vérifiez votre e-mail pour confirmer, puis connectez-vous.")}`,
  );
}
