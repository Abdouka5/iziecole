"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/school-context";

// Personnel is a plain HR directory (name/role/contact) — it does not
// create a login account. Accounts are created from the Utilisateurs
// module instead, so this never touches auth.users.
export async function addStaffMember(formData) {
  const membership = await getCurrentMembership();
  if (membership.role !== "school_admin") {
    redirect("/personnel");
  }

  const fullName = formData.get("fullName")?.toString().trim();
  const role = formData.get("role")?.toString();
  const phoneLocal = formData.get("phoneLocal")?.toString().trim();

  if (!fullName || !role) {
    redirect(`/personnel?new=1&error=${encodeURIComponent("Nom et rôle sont obligatoires.")}`);
  }

  const phone = phoneLocal ? `+221${phoneLocal.replace(/\D/g, "")}` : null;

  const supabase = await createClient();
  const { error } = await supabase.from("staff").insert({
    school_id: membership.school.id,
    full_name: fullName,
    role,
    phone,
  });

  if (error) {
    redirect(`/personnel?new=1&error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/personnel");
  revalidatePath("/dashboard");
  redirect("/personnel");
}

export async function updateStaffMember(formData) {
  const membership = await getCurrentMembership();
  if (membership.role !== "school_admin") {
    redirect("/personnel");
  }

  const staffId = formData.get("staffId")?.toString();
  const fullName = formData.get("fullName")?.toString().trim();
  const role = formData.get("role")?.toString();
  const phoneLocal = formData.get("phoneLocal")?.toString().trim();

  if (!staffId || !fullName || !role) {
    redirect(`/personnel?edit=${staffId}&error=${encodeURIComponent("Nom et rôle sont obligatoires.")}`);
  }

  const phone = phoneLocal ? `+221${phoneLocal.replace(/\D/g, "")}` : null;

  const supabase = await createClient();
  const { error } = await supabase
    .from("staff")
    .update({ full_name: fullName, role, phone })
    .eq("id", staffId);

  if (error) {
    redirect(`/personnel?edit=${staffId}&error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/personnel");
  redirect("/personnel");
}

export async function removeStaffMember(formData) {
  const membership = await getCurrentMembership();
  if (membership.role !== "school_admin") return;

  const supabase = await createClient();
  const staffId = formData.get("staffId")?.toString();
  if (!staffId) return;

  await supabase.from("staff").delete().eq("id", staffId);
  revalidatePath("/personnel");
  revalidatePath("/dashboard");
}
