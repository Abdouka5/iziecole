// Records the frais d'inscription (registration fee) collected on the
// Inscription page, through the same fee_schedules -> invoices -> payments
// chain Finance's own recordPayment uses — so it shows up in Finance's
// history and totals automatically, with no special-casing there. Kept
// separate from recordPayment (which is about recurring tuition, one
// fee_schedule per level/year) since this is a distinct, one-time fee —
// sharing the find-or-create pattern but not the "Frais de scolarité" row
// it operates on.
function receiptNumber() {
  return `REC-${Date.now().toString(36).toUpperCase()}`;
}

// Returns { paymentId } on success or { error } — never throws, so the
// caller can decide whether a failed payment should still let the
// enrollment itself go through.
export async function recordInscriptionPayment(supabase, { schoolId, studentId, levelId, schoolYearId, amount, method, registeredBy }) {
  if (!levelId || !schoolYearId) {
    return { error: "Une classe est nécessaire pour enregistrer le paiement des frais d'inscription." };
  }

  const { data: yearRow } = await supabase.from("school_years").select("label").eq("id", schoolYearId).maybeSingle();
  const periodLabel = `Inscription ${yearRow?.label ?? ""}`.trim();

  let { data: feeSchedule } = await supabase
    .from("fee_schedules")
    .select("id")
    .eq("school_id", schoolId)
    .eq("level_id", levelId)
    .eq("school_year_id", schoolYearId)
    .eq("label", "Frais d'inscription")
    .maybeSingle();

  if (!feeSchedule) {
    const { data: created, error } = await supabase
      .from("fee_schedules")
      .insert({
        school_id: schoolId,
        level_id: levelId,
        school_year_id: schoolYearId,
        label: "Frais d'inscription",
        amount,
        frequency: "annuel",
      })
      .select("id")
      .single();
    if (error) return { error: error.message };
    feeSchedule = created;
  }

  let { data: invoice } = await supabase
    .from("invoices")
    .select("id")
    .eq("student_id", studentId)
    .eq("fee_schedule_id", feeSchedule.id)
    .eq("period_label", periodLabel)
    .maybeSingle();

  if (!invoice) {
    const { data: created, error } = await supabase
      .from("invoices")
      .insert({
        school_id: schoolId,
        student_id: studentId,
        fee_schedule_id: feeSchedule.id,
        period_label: periodLabel,
        amount_due: amount,
        due_date: new Date().toISOString().slice(0, 10),
      })
      .select("id")
      .single();
    if (error) return { error: error.message };
    invoice = created;
  }

  const { data: payment, error: paymentError } = await supabase
    .from("payments")
    .insert({
      school_id: schoolId,
      invoice_id: invoice.id,
      student_id: studentId,
      amount,
      method,
      receipt_number: receiptNumber(),
      received_by: registeredBy,
    })
    .select("id")
    .single();
  if (paymentError) return { error: paymentError.message };

  return { paymentId: payment.id };
}
