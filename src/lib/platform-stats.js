import { getSubscriptionStatus } from "@/lib/subscription-status";
import { formatFcfa } from "@/lib/subscription-plans";

// RLS on schools/students/memberships already grants a super admin full
// visibility (is_super_admin() is baked into is_member_of_school() /
// has_role_in_school()), so these queries need no school_id filter.
export async function getSchoolsOverview(supabase) {
  const [{ data: schools }, { data: students }, { data: admins }] = await Promise.all([
    supabase
      .from("schools")
      .select("id, name, slug, address, phone, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("students").select("id, school_id, status"),
    supabase.from("memberships").select("school_id, user_id, profiles(full_name)").eq("role", "school_admin"),
  ]);

  const studentCountBySchool = new Map();
  for (const s of students ?? []) {
    if (s.status !== "active") continue;
    studentCountBySchool.set(s.school_id, (studentCountBySchool.get(s.school_id) ?? 0) + 1);
  }

  const adminBySchool = new Map();
  for (const m of admins ?? []) {
    if (!adminBySchool.has(m.school_id)) adminBySchool.set(m.school_id, m.profiles?.full_name ?? null);
  }

  const statuses = await Promise.all((schools ?? []).map((s) => getSubscriptionStatus(supabase, s.id)));

  return (schools ?? []).map((school, i) => ({
    ...school,
    studentCount: studentCountBySchool.get(school.id) ?? 0,
    adminName: adminBySchool.get(school.id) ?? null,
    subscription: statuses[i],
  }));
}

export function percentChange(current, previous) {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

// Real, computed notifications for the AdminHeader bell — no fabricated
// unread counter, just the most recent notable platform events: new
// schools, payments received, and subscriptions expiring soon or already
// expired. `type` is a string (not an icon component) so this can cross
// the server/client boundary as a prop into AdminHeader.
export async function getPlatformNotifications(supabase) {
  const [{ data: schools }, { data: payments }, overview] = await Promise.all([
    supabase.from("schools").select("id, name, created_at").order("created_at", { ascending: false }).limit(5),
    supabase
      .from("subscription_payments")
      .select("id, amount, paid_at, schools(name)")
      .eq("status", "paid")
      .order("paid_at", { ascending: false })
      .limit(5),
    getSchoolsOverview(supabase),
  ]);

  const expiring = overview.filter((s) => !s.subscription.active || s.subscription.daysRemaining <= 5);

  const notifications = [
    ...(schools ?? []).map((s) => ({
      id: `school-${s.id}`,
      type: "school",
      title: "Nouvelle école inscrite",
      subtitle: s.name,
      at: s.created_at,
    })),
    ...(payments ?? []).map((p) => ({
      id: `payment-${p.id}`,
      type: "payment",
      title: "Paiement reçu",
      subtitle: `${formatFcfa(Number(p.amount))} — ${p.schools?.name ?? ""}`,
      at: p.paid_at,
    })),
    ...expiring.slice(0, 5).map((s) => ({
      id: `subscription-${s.id}`,
      type: "subscription",
      title: s.subscription.active ? "Abonnement bientôt expiré" : "Abonnement expiré",
      subtitle: s.name,
      at: s.subscription.expiresAt ?? s.created_at,
    })),
  ]
    .sort((a, b) => new Date(b.at) - new Date(a.at))
    .slice(0, 8);

  return notifications;
}
