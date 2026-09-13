"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentMembership } from "@/lib/school-context";
import { createClient } from "@/lib/supabase/server";

export async function createPlatformAnnouncement(formData) {
  const membership = await getCurrentMembership();
  if (membership.role !== "super_admin") redirect("/dashboard");

  const title = formData.get("title")?.toString().trim();
  const body = formData.get("body")?.toString().trim();

  if (!title || !body) {
    redirect(`/admin/content?new=1&error=${encodeURIComponent("Titre et message sont obligatoires.")}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.from("platform_announcements").insert({
    title,
    body,
    created_by: membership.userId,
  });

  if (error) {
    redirect(`/admin/content?new=1&error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/content");
  redirect("/admin/content");
}

export async function togglePlatformAnnouncement(formData) {
  const membership = await getCurrentMembership();
  if (membership.role !== "super_admin") return;

  const id = formData.get("id")?.toString();
  const active = formData.get("active")?.toString() === "true";
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("platform_announcements").update({ active }).eq("id", id);
  revalidatePath("/admin/content");
}

export async function deletePlatformAnnouncement(formData) {
  const membership = await getCurrentMembership();
  if (membership.role !== "super_admin") return;

  const id = formData.get("id")?.toString();
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("platform_announcements").delete().eq("id", id);
  revalidatePath("/admin/content");
}
