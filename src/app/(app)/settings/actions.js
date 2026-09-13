"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/school-context";
import { createSubscriptionPaymentRequest } from "@/lib/paytech";
import { SUBSCRIPTION_PRICE, SUBSCRIPTION_DURATION_DAYS } from "@/lib/subscription-plans";

function periodLabel() {
  const start = new Date();
  const end = new Date();
  end.setDate(end.getDate() + SUBSCRIPTION_DURATION_DAYS);
  const fmt = (d) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  return `${fmt(start)} – ${fmt(end)}`;
}

export async function paySubscription() {
  const membership = await getCurrentMembership();
  if (membership.role !== "school_admin" && membership.role !== "super_admin") {
    throw new Error("Seule la direction peut payer l'abonnement de l'école.");
  }

  const supabase = await createClient();
  const { data: subscriptionPayment, error } = await supabase
    .from("subscription_payments")
    .insert({
      school_id: membership.school.id,
      plan: membership.school.subscription_plan,
      amount: SUBSCRIPTION_PRICE,
      period_label: periodLabel(),
    })
    .select("id, amount, period_label")
    .single();

  if (error) throw error;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const { redirectUrl } = await createSubscriptionPaymentRequest({
    subscriptionPayment,
    appUrl,
  });

  redirect(redirectUrl);
}
