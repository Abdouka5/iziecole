-- Terms (trimestres/semestres) and grades. Averages, class ranking and PDF
-- bulletins are computed in the application layer from this raw data.

create table public.terms (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  school_year_id uuid not null references public.school_years (id) on delete cascade,
  name text not null, -- e.g. "Trimestre 1"
  sequence int not null,
  start_date date not null,
  end_date date not null,
  created_at timestamptz not null default now(),
  unique (school_year_id, sequence)
);

create table public.grades (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  class_subject_id uuid not null references public.class_subjects (id) on delete cascade,
  term_id uuid not null references public.terms (id) on delete cascade,
  score numeric(5, 2) not null,
  max_score numeric(5, 2) not null default 20,
  comment text,
  graded_by uuid references public.profiles (id) on delete set null,
  graded_at timestamptz not null default now(),
  unique (student_id, class_subject_id, term_id)
);

create index terms_school_year_id_idx on public.terms (school_year_id);
create index grades_student_id_idx on public.grades (student_id);
create index grades_class_subject_id_idx on public.grades (class_subject_id);

-- The teacher assigned to a class_subject may grade it; admins grade anything.
create function public.can_grade_class_subject(target_class_subject_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_super_admin()
    or exists (
      select 1 from public.class_subjects cs
      where cs.id = target_class_subject_id
        and (
          public.has_role_in_school(cs.school_id, 'school_admin')
          or cs.teacher_id = auth.uid()
        )
    );
$$;

alter table public.terms enable row level security;
alter table public.grades enable row level security;

create policy "members can view terms" on public.terms
  for select using (public.is_member_of_school(school_id));
create policy "school admins manage terms" on public.terms
  for all using (public.has_role_in_school(school_id, 'school_admin'))
  with check (public.has_role_in_school(school_id, 'school_admin'));

create policy "staff can view grades in their school" on public.grades
  for select using (
    public.has_role_in_school(school_id, 'school_admin')
    or public.has_role_in_school(school_id, 'teacher')
  );
create policy "parents and students can view their own grades" on public.grades
  for select using (public.can_view_student(student_id));
create policy "teachers manage grades for their class_subjects" on public.grades
  for insert with check (public.can_grade_class_subject(class_subject_id));
create policy "teachers update grades for their class_subjects" on public.grades
  for update using (public.can_grade_class_subject(class_subject_id));
create policy "teachers delete grades for their class_subjects" on public.grades
  for delete using (public.can_grade_class_subject(class_subject_id));
