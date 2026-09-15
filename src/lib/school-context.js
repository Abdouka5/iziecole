import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { SCHOOL_COOKIE } from "@/lib/school-cookie";

export { SCHOOL_COOKIE };

// Resolves { role, school, fullName, userId } for the currently signed-in
// user. Super admins don't need a selected school at all (the /admin
// console is platform-wide) — `school` is just whichever one they're
// currently impersonating via /admin/schools' "Voir", or null if none.
// Everyone else needs the school_id cookie (set at login, or manually via
// /select-school) to resolve to one of their memberships.
// Wrapped in React's cache() so the layout and the page it renders share one
// result instead of re-querying per request.
export const getCurrentMembership = cache(async function getCurrentMembership() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_super_admin, full_name")
    .eq("id", user.id)
    .maybeSingle();

  const cookieStore = await cookies();
  const schoolId = cookieStore.get(SCHOOL_COOKIE)?.value;

  let school = null;
  if (schoolId) {
    const { data } = await supabase
      .from("schools")
      .select("id, name, slug, subscription_plan, address, phone, logo_url")
      .eq("id", schoolId)
      .maybeSingle();
    school = data ?? null;
  }

  if (profile?.is_super_admin) {
    return { role: "super_admin", school, fullName: profile.full_name, userId: user.id };
  }

  if (!school) return null;

  const { data: membership } = await supabase
    .from("memberships")
    .select("role, suspended")
    .eq("user_id", user.id)
    .eq("school_id", schoolId)
    .maybeSingle();
  if (!membership || membership.suspended) return null;

  return { role: membership.role, school, fullName: profile?.full_name, userId: user.id };
});
