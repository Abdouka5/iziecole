"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/school-context";
import { createSubscriptionPaymentRequest } from "@/lib/paytech";
import { PLAN_PRICES } from "@/lib/subscription-plans";

function currentPeriodLabel() {
  const label = new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export async function paySubscription() {
  const membership = await getCurrentMembership();
  if (membership.role !== "school_admin" && membership.role !== "super_admin") {
    throw new Error("Seule la direction peut payer l'abonnement de l'école.");
  }

  const plan = membership.school.subscription_plan;
  const amount = PLAN_PRICES[plan];
  const periodLabel = currentPeriodLabel();

  const supabase = await createClient();
  const { data: subscriptionPayment, error } = await supabase
    .from("subscription_payments")
    .insert({
      school_id: membership.school.id,
      plan,
      amount,
      period_label: periodLabel,
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
