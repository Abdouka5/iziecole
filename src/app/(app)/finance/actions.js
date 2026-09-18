"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/school-context";

function periodLabelFromDate(dateString) {
  const date = dateString ? new Date(dateString) : new Date();
  const label = date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function receiptNumber() {
  return `REC-${Date.now().toString(36).toUpperCase()}`;
}

// Recording a payment normally assumes an invoice already exists (generated
// from a fee_schedule). There's no invoice-generation UI yet, so this finds
// or creates a minimal one on the fly for the student's level/year — this
// matches the cahier des charges' actual cashier workflow (search student ->
// take payment -> print receipt) more closely than requiring a separate
// "generate invoices first" step.
export async function recordPayment(formData) {
  const membership = await getCurrentMembership();
  const schoolId = membership.school.id;
  const supabase = await createClient();

  const studentId = formData.get("studentId")?.toString();
  const amount = Number(formData.get("amount"));
  const method = formData.get("method")?.toString();
  const periodDate = formData.get("periodDate")?.toString();
  const periodLabel = periodLabelFromDate(periodDate);

  if (!studentId || !amount || amount <= 0 || !method) {
    redirect(`/finance?newPayment=1&error=${encodeURIComponent("Élève, montant et mode de paiement sont obligatoires.")}`);
  }

  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("classes(level_id, school_year_id)")
    .eq("student_id", studentId)
    .eq("status", "active")
    .maybeSingle();

  const levelId = enrollment?.classes?.level_id;
  const schoolYearId = enrollment?.classes?.school_year_id;

  if (!levelId || !schoolYearId) {
    redirect(
      `/finance?newPayment=1&error=${encodeURIComponent("Cet élève doit être affecté à une classe avant de pouvoir encaisser un paiement.")}`,
    );
  }

  let { data: feeSchedule } = await supabase
    .from("fee_schedules")
    .select("id, amount")
    .eq("school_id", schoolId)
    .eq("level_id", levelId)
    .eq("school_year_id", schoolYearId)
    .limit(1)
    .maybeSingle();

  if (!feeSchedule) {
    const { data: created, error: feeError } = await supabase
      .from("fee_schedules")
      .insert({
        school_id: schoolId,
        level_id: levelId,
        school_year_id: schoolYearId,
        label: "Frais de scolarité",
        amount,
        frequency: "mensuel",
      })
      .select("id, amount")
      .single();
    if (feeError) {
      redirect(`/finance?newPayment=1&error=${encodeURIComponent(feeError.message)}`);
    }
    feeSchedule = created;
  }

  let { data: invoice } = await supabase
    .from("invoices")
    .select("id, amount_due")
    .eq("student_id", studentId)
    .eq("fee_schedule_id", feeSchedule.id)
    .eq("period_label", periodLabel)
    .maybeSingle();

  if (!invoice) {
    const { data: created, error: invoiceError } = await supabase
      .from("invoices")
      .insert({
        school_id: schoolId,
        student_id: studentId,
        fee_schedule_id: feeSchedule.id,
        period_label: periodLabel,
        amount_due: amount,
        due_date: new Date().toISOString().slice(0, 10),
      })
      .select("id, amount_due")
      .single();
    if (invoiceError) {
      redirect(`/finance?newPayment=1&error=${encodeURIComponent(invoiceError.message)}`);
    }
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
      received_by: membership.userId,
    })
    .select("id")
    .single();

  if (paymentError) {
    redirect(`/finance?newPayment=1&error=${encodeURIComponent(paymentError.message)}`);
  }

  revalidatePath("/finance");
  redirect(`/finance?receipt=${payment.id}`);
}

export async function createExpense(formData) {
  const membership = await getCurrentMembership();
  const schoolId = membership.school.id;
  const supabase = await createClient();

  const label = formData.get("label")?.toString().trim();
  const amount = Number(formData.get("amount"));
  const expenseDate = formData.get("expenseDate")?.toString() || new Date().toISOString().slice(0, 10);

  if (!label || !amount || amount <= 0) {
    redirect(`/finance?newExpense=1&error=${encodeURIComponent("Libellé et montant sont obligatoires.")}`);
  }

  const { error } = await supabase.from("expenses").insert({
    school_id: schoolId,
    label,
    amount,
    expense_date: expenseDate,
    recorded_by: membership.userId,
  });

  if (error) {
    redirect(`/finance?newExpense=1&error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/finance");
  redirect("/finance");
}

export async function deleteExpense(formData) {
  const supabase = await createClient();
  const expenseId = formData.get("expenseId")?.toString();
  if (!expenseId) return;

  await supabase.from("expenses").delete().eq("id", expenseId);
  revalidatePath("/finance");
}

export async function deletePayment(formData) {
  const supabase = await createClient();
  const paymentId = formData.get("paymentId")?.toString();
  if (!paymentId) return;

  await supabase.from("payments").delete().eq("id", paymentId);
  revalidatePath("/finance");
}
