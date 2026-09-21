-- Teachers typed straight into a class (full name + phone), independent of
-- login accounts. classes.head_teacher_id can only point at a profile, and
-- most schools have no "teacher" memberships, so that picker was empty for
-- them. head_teacher_id stays as-is for classes that already use it.

create table public.class_teachers (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  class_id uuid not null references public.classes (id) on delete cascade,
  full_name text not null,
  phone text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index class_teachers_class_id_idx on public.class_teachers (class_id);

alter table public.class_teachers enable row level security;

create policy "members can view class teachers" on public.class_teachers
  for select using (public.is_member_of_school(school_id));
create policy "school admins manage class teachers" on public.class_teachers
  for all using (public.has_role_in_school(school_id, 'school_admin'))
  with check (public.has_role_in_school(school_id, 'school_admin'));
