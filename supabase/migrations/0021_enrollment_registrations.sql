-- A log of every registration made through the dedicated "Inscription"
-- front-desk tool — one row per registration, whether it created a
-- brand-new student or just enrolled an already-existing one into a class
-- for the current year. Élèves creates/edits students too, but isn't
-- logged here: Inscription's own history should show only its own work,
-- not every student in the school, and a student re-registered later
-- (e.g. moved to another class) gets a second row, not an overwrite —
-- this is a history, not a status flag.

create table public.enrollment_registrations (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  school_year_id uuid not null references public.school_years (id) on delete cascade,
  class_id uuid references public.classes (id) on delete set null,
  registered_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index enrollment_registrations_school_id_idx on public.enrollment_registrations (school_id);
create index enrollment_registrations_student_id_idx on public.enrollment_registrations (student_id);
create index enrollment_registrations_school_year_id_idx on public.enrollment_registrations (school_year_id);

alter table public.enrollment_registrations enable row level security;

create policy "school admins view enrollment registrations" on public.enrollment_registrations
  for select using (public.has_role_in_school(school_id, 'school_admin'));
create policy "school admins add enrollment registrations" on public.enrollment_registrations
  for insert with check (public.has_role_in_school(school_id, 'school_admin'));
