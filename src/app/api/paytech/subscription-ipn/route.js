import { NextResponse } from "next/server";
import { parseRefCommand, verifyIpnAuthenticity } from "@/lib/paytech";
import { createAdminClient } from "@/lib/supabase/admin";

// PayTech calls this server-to-server once a school's subscription payment
// completes — there is no browser session, so authenticity comes from
// verifyIpnAuthenticity() instead of Supabase auth, and updates use the
// service-role client to bypass RLS (see docs/decisions.md — module
// Abonnements).
export async function POST(request) {
  const form = await request.formData();
  const payload = Object.fromEntries(form.entries());

  if (!verifyIpnAuthenticity(payload)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  if (payload.type_event !== "sale_complete") {
    return NextResponse.json({ success: 1 });
  }

  const subscriptionPaymentId = parseRefCommand(payload.ref_command);
  if (!subscriptionPaymentId) {
    return NextResponse.json({ error: "unknown ref_command" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: subscriptionPayment } = await supabase
    .from("subscription_payments")
    .select("id, school_id, plan, status")
    .eq("id", subscriptionPaymentId)
    .maybeSingle();

  if (!subscriptionPayment) {
    return NextResponse.json({ error: "subscription payment not found" }, { status: 404 });
  }

  // Already recorded — PayTech retries IPN calls (at-least-once delivery).
  if (subscriptionPayment.status === "paid") {
    return NextResponse.json({ success: 1 });
  }

  const { error: updateError } = await supabase
    .from("subscription_payments")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", subscriptionPaymentId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Activate the plan that was just paid for (handles renewals and plan changes alike).
  await supabase
    .from("schools")
    .update({ subscription_plan: subscriptionPayment.plan })
    .eq("id", subscriptionPayment.school_id);

  return NextResponse.json({ success: 1 });
}
