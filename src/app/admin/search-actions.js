"use server";

import { getCurrentMembership } from "@/lib/school-context";
import { createClient } from "@/lib/supabase/server";

export async function searchPlatform(query) {
  const membership = await getCurrentMembership();
  const term = query?.toString().trim();
  if (membership?.role !== "super_admin" || !term || term.length < 2) {
    return { schools: [], users: [] };
  }

  const supabase = await createClient();
  const [{ data: schools }, { data: users }] = await Promise.all([
    supabase.from("schools").select("id, name").ilike("name", `%${term}%`).limit(5),
    supabase.from("profiles").select("id, full_name").ilike("full_name", `%${term}%`).limit(5),
  ]);

  return { schools: schools ?? [], users: users ?? [] };
}
