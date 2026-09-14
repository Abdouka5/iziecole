"use server";

import { getCurrentMembership } from "@/lib/school-context";
import { createClient } from "@/lib/supabase/server";

export async function searchSchool(query) {
  const membership = await getCurrentMembership();
  const term = query?.toString().trim();
  if (!membership?.school?.id || !term || term.length < 2) {
    return { students: [], classes: [] };
  }

  const supabase = await createClient();
  const schoolId = membership.school.id;

  const [{ data: students }, { data: classes }] = await Promise.all([
    supabase
      .from("students")
      .select("id, first_name, last_name, matricule")
      .eq("school_id", schoolId)
      .or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,matricule.ilike.%${term}%`)
      .limit(5),
    supabase
      .from("classes")
      .select("id, name")
      .eq("school_id", schoolId)
      .ilike("name", `%${term}%`)
      .limit(5),
  ]);

  return { students: students ?? [], classes: classes ?? [] };
}
