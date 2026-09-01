-- Student records, per-year enrollments, and the parent <-> student link
-- (guardians) that scopes what a parent account is allowed to see.

create table public.students (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null, -- set when the student has their own login
  matricule text not null,
  first_name text not null,
  last_name text not null,
  birth_date date,
  gender text check (gender in ('M', 'F')),
  photo_url text,
  status text not null default 'active'
    check (status in ('active', 'transferred', 'graduated', 'withdrawn')),
  created_at timestamptz not null default now(),
  unique (school_id, matricule)
);

create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  school_year_id uuid not null references public.school_years (id) on delete cascade,
  class_id uuid not null references public.classes (id) on delete restrict,
  enrolled_at timestamptz not null default now(),
  status text not null default 'active'
    check (status in ('active', 'transferred', 'graduated', 'withdrawn')),
  unique (student_id, school_year_id)
);

create table public.guardians (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  parent_user_id uuid not null references public.profiles (id) on delete cascade,
  relationship text, -- e.g. "Père", "Mère", "Tuteur"
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  unique (student_id, parent_user_id)
);

create index students_school_id_idx on public.students (school_id);
create index enrollments_class_id_idx on public.enrollments (class_id);
create index guardians_parent_user_id_idx on public.guardians (parent_user_id);
create index guardians_student_id_idx on public.guardians (student_id);

-- A parent can see a student if they are linked as a guardian.
-- A student with their own login can see their own record.
create function public.can_view_student(target_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_super_admin()
    or exists (
      select 1 from public.students s
      where s.id = target_student_id
        and (
          public.has_role_in_school(s.school_id, 'school_admin')
          or public.has_role_in_school(s.school_id, 'teacher')
          or public.has_role_in_school(s.school_id, 'cashier')
          or s.user_id = auth.uid()
        )
    )
    or exists (
      select 1 from public.guardians g
      where g.student_id = target_student_id and g.parent_user_id = auth.uid()
    );
$$;

alter table public.students enable row level security;
alter table public.enrollments enable row level security;
alter table public.guardians enable row level security;

create policy "staff can view students in their school" on public.students
  for select using (
    public.has_role_in_school(school_id, 'school_admin')
    or public.has_role_in_school(school_id, 'teacher')
    or public.has_role_in_school(school_id, 'cashier')
    or public.is_super_admin()
  );
create policy "students can view their own record" on public.students
  for select using (user_id = auth.uid());
create policy "parents can view their children" on public.students
  for select using (public.can_view_student(id));
create policy "school admins manage students" on public.students
  for all using (public.has_role_in_school(school_id, 'school_admin'))
  with check (public.has_role_in_school(school_id, 'school_admin'));

create policy "school staff can view enrollments" on public.enrollments
  for select using (
    public.has_role_in_school(school_id, 'school_admin')
    or public.has_role_in_school(school_id, 'teacher')
    or public.has_role_in_school(school_id, 'cashier')
  );
create policy "parents can view their children's enrollments" on public.enrollments
  for select using (public.can_view_student(student_id));
create policy "school admins manage enrollments" on public.enrollments
  for all using (public.has_role_in_school(school_id, 'school_admin'))
  with check (public.has_role_in_school(school_id, 'school_admin'));

create policy "school admins manage guardians" on public.guardians
  for all using (public.has_role_in_school(school_id, 'school_admin'))
  with check (public.has_role_in_school(school_id, 'school_admin'));
create policy "parents can view their own guardian links" on public.guardians
  for select using (parent_user_id = auth.uid());
