"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/school-context";

// Manual escape hatch for when PayTech's IPN webhook never arrives (wrong
// NEXT_PUBLIC_APP_URL, a school genuinely paid but the server-to-server
// call got dropped, etc.) — a school_admin stuck on "En attente" despite
// having actually paid has no other way to unblock their account. Mirrors
// exactly what /api/paytech/subscription-ipn does on a real IPN.
export async function markPaymentAsPaid(formData) {
  const membership = await getCurrentMembership();
  if (membership?.role !== "super_admin") {
    throw new Error("Seul un super admin peut confirmer un paiement manuellement.");
  }

  const paymentId = formData.get("paymentId")?.toString();
  if (!paymentId) redirect("/admin/payments");

  const supabase = await createClient();
  const { data: payment } = await supabase
    .from("subscription_payments")
    .select("id, school_id, plan, status")
    .eq("id", paymentId)
    .maybeSingle();

  if (!payment || payment.status === "paid") {
    redirect("/admin/payments");
  }

  await supabase
    .from("subscription_payments")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", paymentId);

  await supabase.from("schools").update({ subscription_plan: payment.plan }).eq("id", payment.school_id);

  revalidatePath("/admin/payments");
  revalidatePath("/", "layout");
  redirect("/admin/payments");
}
