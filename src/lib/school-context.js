import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export const SCHOOL_COOKIE = "iziecole_school_id";

// Resolves { role, school } for the currently signed-in user from the
// school_id stored in a cookie (set on /select-school). Super admins bypass
// the memberships table entirely — they can view any school.
// Wrapped in React's cache() so the layout and the page it renders share one
// result instead of re-querying per request.
export const getCurrentMembership = cache(async function getCurrentMembership() {
  const cookieStore = await cookies();
  const schoolId = cookieStore.get(SCHOOL_COOKIE)?.value;
  if (!schoolId) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: school } = await supabase
    .from("schools")
    .select("id, name, slug, subscription_plan")
    .eq("id", schoolId)
    .maybeSingle();
  if (!school) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_super_admin, full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.is_super_admin) {
    return { role: "super_admin", school, fullName: profile.full_name };
  }

  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("school_id", schoolId)
    .maybeSingle();
  if (!membership) return null;

  return { role: membership.role, school, fullName: profile?.full_name };
});
