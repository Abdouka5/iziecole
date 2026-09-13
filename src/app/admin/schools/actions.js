"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentMembership, SCHOOL_COOKIE } from "@/lib/school-context";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureDefaultSubjects, ensureDefaultLevels } from "@/lib/school-defaults";
import { slugify, uniqueSlug } from "@/lib/school-slug";

export async function createSchool(formData) {
  const membership = await getCurrentMembership();
  if (membership.role !== "super_admin") redirect("/dashboard");

  const schoolName = formData.get("schoolName")?.toString().trim();
  const adminFullName = formData.get("adminFullName")?.toString().trim();
  const adminEmail = formData.get("adminEmail")?.toString().trim();
  const adminPhoneLocal = formData.get("adminPhoneLocal")?.toString().trim();
  const adminPassword = formData.get("adminPassword")?.toString();

  if (!schoolName || !adminFullName || !adminEmail || !adminPassword) {
    redirect(`/admin/schools?new=1&error=${encodeURIComponent("Merci de remplir tous les champs.")}`);
  }
  if (adminPassword.length < 6) {
    redirect(`/admin/schools?new=1&error=${encodeURIComponent("Le mot de passe doit faire au moins 6 caractères.")}`);
  }

  const admin = createAdminClient();
  const slug = await uniqueSlug(admin, slugify(schoolName));
  const phone = adminPhoneLocal ? `+221${adminPhoneLocal.replace(/\D/g, "")}` : null;

  const { data: school, error: schoolError } = await admin
    .from("schools")
    .insert({ name: schoolName, slug })
    .select("id")
    .single();

  if (schoolError) {
    redirect(`/admin/schools?new=1&error=${encodeURIComponent(schoolError.message)}`);
  }

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
    user_metadata: { full_name: adminFullName },
  });

  if (authError) {
    await admin.from("schools").delete().eq("id", school.id);
    redirect(`/admin/schools?new=1&error=${encodeURIComponent(authError.message)}`);
  }

  const userId = authData.user.id;
  if (phone) {
    await admin.from("profiles").update({ phone }).eq("id", userId);
  }

  await admin.from("memberships").insert({ user_id: userId, school_id: school.id, role: "school_admin" });

  await Promise.all([
    ensureDefaultSubjects(admin, school.id),
    ensureDefaultLevels(admin, school.id),
  ]);

  revalidatePath("/admin");
  revalidatePath("/admin/schools");
  redirect(`/admin/schools?created=${encodeURIComponent(adminEmail)}`);
}

// Lets a super admin drop into a specific school's own (light-chrome)
// dashboard to inspect it, the way select-school does for a school_admin
// — the school picker's own ROLE_HOME_PATH sends super_admin back to
// /admin regardless of which school was picked, so this bypasses it.
export async function viewSchoolDashboard(formData) {
  const membership = await getCurrentMembership();
  if (membership.role !== "super_admin") redirect("/dashboard");

  const schoolId = formData.get("schoolId")?.toString();
  if (!schoolId) return;

  const cookieStore = await cookies();
  cookieStore.set(SCHOOL_COOKIE, schoolId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  redirect("/dashboard");
}

export async function deleteSchool(formData) {
  const membership = await getCurrentMembership();
  if (membership.role !== "super_admin") return;

  const schoolId = formData.get("schoolId")?.toString();
  if (!schoolId) return;

  const supabase = await createClient();
  await supabase.from("schools").delete().eq("id", schoolId);

  revalidatePath("/admin");
  revalidatePath("/admin/schools");
}
