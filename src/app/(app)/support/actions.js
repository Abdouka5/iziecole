"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentMembership } from "@/lib/school-context";
import { createClient } from "@/lib/supabase/server";

export async function createTicket(formData) {
  const membership = await getCurrentMembership();
  if (membership.role !== "school_admin") redirect("/dashboard");

  const subject = formData.get("subject")?.toString().trim();
  const message = formData.get("message")?.toString().trim();

  if (!subject || !message) {
    redirect(`/support?error=${encodeURIComponent("Sujet et message sont obligatoires.")}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.from("support_tickets").insert({
    school_id: membership.school.id,
    created_by: membership.userId,
    subject,
    message,
  });

  if (error) {
    redirect(`/support?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/support");
  redirect("/support?sent=1");
}
