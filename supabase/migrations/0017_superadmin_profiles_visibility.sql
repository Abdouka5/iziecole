-- Every other tenant table's RLS bakes "is_super_admin() OR ..." into the
-- is_member_of_school()/has_role_in_school() helpers, so a super admin
-- transparently sees every row. profiles' own policies ("own profile" /
-- "co-members") don't go through those helpers and never granted that
-- bypass — a super admin has no memberships of their own, so they were
-- silently restricted to their own profile row only. This under-counted
-- the "Utilisateurs" KPI and broke the platform search/notifications from
-- ever finding other users.
create policy "super admins can view all profiles" on public.profiles
  for select using (public.is_super_admin());
