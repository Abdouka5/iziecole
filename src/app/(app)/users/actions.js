"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentMembership } from "@/lib/school-context";

// Creates the auth user directly (service-role) rather than emailing an
// invite link — Supabase's inviteUserByEmail depends on SMTP being
// configured on the project, which we can't assume. The admin sets a
// temporary password here and shares it with the new user out-of-band
// (WhatsApp, in person), matching how this school already communicates.
export async function inviteUser(formData) {
  const membership = await getCurrentMembership();
  if (membership.role !== "school_admin") {
    redirect("/users");
  }

  const email = formData.get("email")?.toString().trim();
  const fullName = formData.get("fullName")?.toString().trim();
  const phoneLocal = formData.get("phoneLocal")?.toString().trim();
  const role = formData.get("role")?.toString();
  const password = formData.get("password")?.toString();

  if (!email || !fullName || !role || !password) {
    redirect(`/users?new=1&error=${encodeURIComponent("Merci de remplir tous les champs.")}`);
  }
  if (password.length < 6) {
    redirect(`/users?new=1&error=${encodeURIComponent("Le mot de passe doit faire au moins 6 caractères.")}`);
  }

  const admin = createAdminClient();
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (authError) {
    redirect(`/users?new=1&error=${encodeURIComponent(authError.message)}`);
  }

  const userId = authData.user.id;
  const phone = phoneLocal ? `+221${phoneLocal.replace(/\D/g, "")}` : null;
  if (phone) {
    await admin.from("profiles").update({ phone }).eq("id", userId);
  }

  const { error: membershipError } = await admin.from("memberships").insert({
    user_id: userId,
    school_id: membership.school.id,
    role,
  });

  if (membershipError) {
    redirect(`/users?new=1&error=${encodeURIComponent(membershipError.message)}`);
  }

  revalidatePath("/users");
  redirect(`/users?created=${encodeURIComponent(email)}`);
}

export async function removeMembership(formData) {
  const membership = await getCurrentMembership();
  if (membership.role !== "school_admin") return;

  const supabase = await createClient();
  const membershipId = formData.get("membershipId")?.toString();
  if (!membershipId) return;

  await supabase.from("memberships").delete().eq("id", membershipId);
  revalidatePath("/users");
}

export async function toggleUserSuspension(formData) {
  const membership = await getCurrentMembership();
  if (membership.role !== "school_admin") return;

  const membershipId = formData.get("membershipId")?.toString();
  const suspended = formData.get("suspended")?.toString() === "true";
  if (!membershipId) return;

  const supabase = await createClient();
  await supabase.from("memberships").update({ suspended }).eq("id", membershipId);
  revalidatePath("/users");
}

// Full name/phone live on profiles, which RLS only lets a user edit for
// themselves — the admin client is required to edit someone else's here.
export async function updateUserAccount(formData) {
  const membership = await getCurrentMembership();
  if (membership.role !== "school_admin") {
    redirect("/users");
  }

  const membershipId = formData.get("membershipId")?.toString();
  const userId = formData.get("userId")?.toString();
  const fullName = formData.get("fullName")?.toString().trim();
  const phoneLocal = formData.get("phoneLocal")?.toString().trim();
  const role = formData.get("role")?.toString();

  if (!membershipId || !userId || !fullName || !role) {
    redirect(`/users?edit=${membershipId}&error=${encodeURIComponent("Nom et rôle sont obligatoires.")}`);
  }

  const phone = phoneLocal ? `+221${phoneLocal.replace(/\D/g, "")}` : null;

  const admin = createAdminClient();
  await admin.from("profiles").update({ full_name: fullName, phone }).eq("id", userId);

  const supabase = await createClient();
  const { error } = await supabase.from("memberships").update({ role }).eq("id", membershipId);

  if (error) {
    redirect(`/users?edit=${membershipId}&error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/users");
  redirect("/users");
}
