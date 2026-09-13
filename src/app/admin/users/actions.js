"use server";

import { revalidatePath } from "next/cache";
import { getCurrentMembership } from "@/lib/school-context";
import { createClient } from "@/lib/supabase/server";

export async function toggleUserSuspension(formData) {
  const membership = await getCurrentMembership();
  if (membership.role !== "super_admin") return;

  const membershipId = formData.get("membershipId")?.toString();
  const suspended = formData.get("suspended")?.toString() === "true";
  if (!membershipId) return;

  const supabase = await createClient();
  await supabase.from("memberships").update({ suspended }).eq("id", membershipId);
  revalidatePath("/admin/users");
}

export async function removeMembership(formData) {
  const membership = await getCurrentMembership();
  if (membership.role !== "super_admin") return;

  const membershipId = formData.get("membershipId")?.toString();
  if (!membershipId) return;

  const supabase = await createClient();
  await supabase.from("memberships").delete().eq("id", membershipId);
  revalidatePath("/admin/users");
}
