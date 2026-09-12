"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/school-context";

export async function createAnnouncement(formData) {
  const membership = await getCurrentMembership();
  const supabase = await createClient();

  const title = formData.get("title")?.toString().trim();
  const body = formData.get("body")?.toString().trim();
  if (!title || !body) {
    redirect(`/communication?newAnnouncement=1&error=${encodeURIComponent("Titre et message sont obligatoires.")}`);
  }

  const { error } = await supabase.from("announcements").insert({
    school_id: membership.school.id,
    author_id: membership.userId,
    title,
    body,
    audience: "all",
  });

  if (error) {
    redirect(`/communication?newAnnouncement=1&error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/communication");
  redirect("/communication");
}

export async function sendMessage(formData) {
  const membership = await getCurrentMembership();
  const supabase = await createClient();

  const recipientId = formData.get("recipientId")?.toString();
  const subject = formData.get("subject")?.toString().trim();
  const body = formData.get("body")?.toString().trim();

  if (!recipientId || !body) {
    redirect(`/communication?tab=messages&newMessage=1&error=${encodeURIComponent("Destinataire et message sont obligatoires.")}`);
  }

  const { error } = await supabase.from("messages").insert({
    school_id: membership.school.id,
    sender_id: membership.userId,
    recipient_id: recipientId,
    subject,
    body,
  });

  if (error) {
    redirect(`/communication?tab=messages&newMessage=1&error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/communication");
  redirect("/communication?tab=messages");
}
