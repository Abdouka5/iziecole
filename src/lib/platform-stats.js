import { getSubscriptionStatus } from "@/lib/subscription-status";

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
