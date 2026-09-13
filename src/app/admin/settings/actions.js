"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentMembership } from "@/lib/school-context";
import { createClient } from "@/lib/supabase/server";

export async function updateOwnProfile(formData) {
  const membership = await getCurrentMembership();
  if (membership.role !== "super_admin") redirect("/dashboard");

  const fullName = formData.get("fullName")?.toString().trim();
  const phoneLocal = formData.get("phoneLocal")?.toString().trim();

  if (!fullName) {
    redirect(`/admin/settings?error=${encodeURIComponent("Le nom est obligatoire.")}`);
  }

  const phone = phoneLocal ? `+221${phoneLocal.replace(/\D/g, "")}` : null;

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName, phone })
    .eq("id", membership.userId);

  if (error) {
    redirect(`/admin/settings?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/", "layout");
  redirect("/admin/settings?saved=1");
}

export async function updateOwnPassword(formData) {
  const membership = await getCurrentMembership();
  if (membership.role !== "super_admin") redirect("/dashboard");

  const password = formData.get("password")?.toString();
  if (!password || password.length < 6) {
    redirect(`/admin/settings?error=${encodeURIComponent("Le mot de passe doit faire au moins 6 caractères.")}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    redirect(`/admin/settings?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/admin/settings?passwordChanged=1");
}
