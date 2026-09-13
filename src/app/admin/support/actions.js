"use server";

import { revalidatePath } from "next/cache";
import { getCurrentMembership } from "@/lib/school-context";
import { createClient } from "@/lib/supabase/server";

export async function toggleTicketStatus(formData) {
  const membership = await getCurrentMembership();
  if (membership.role !== "super_admin") return;

  const id = formData.get("id")?.toString();
  const status = formData.get("status")?.toString();
  if (!id || !status) return;

  const supabase = await createClient();
  await supabase.from("support_tickets").update({ status }).eq("id", id);
  revalidatePath("/admin/support");
}
