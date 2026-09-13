-- Personnel is now a plain HR directory, separate from login accounts
-- (those are created from the new Utilisateurs module instead). A staff
-- row is just a name/role/contact record with no link to auth.users.

create table public.staff (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('school_admin', 'teacher', 'cashier')),
  phone text,
  email text,
  created_at timestamptz not null default now()
);

create index staff_school_id_idx on public.staff (school_id);

alter table public.staff enable row level security;

create policy "staff directory visible to school members" on public.staff
  for select using (public.is_member_of_school(school_id));
create policy "school admins manage staff directory" on public.staff
  for all using (public.has_role_in_school(school_id, 'school_admin'))
  with check (public.has_role_in_school(school_id, 'school_admin'));
