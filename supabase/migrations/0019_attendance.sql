-- Absences / Retards: a simple log of tardiness and absence events, each
-- optionally "justifié" (a parent brought a note, etc.), printable as an
-- 80mm thermal ticket the same way payment receipts are.

create table public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  class_id uuid references public.classes (id) on delete set null,
  type text not null check (type in ('absence', 'retard')),
  occurred_on date not null default current_date,
  reason text,
  justified boolean not null default false,
  recorded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index attendance_records_school_id_idx on public.attendance_records (school_id);
create index attendance_records_student_id_idx on public.attendance_records (student_id);

alter table public.attendance_records enable row level security;

-- Direction and teachers both record/consult attendance day to day;
-- justifying or removing an entry (a parent's note, a mistaken entry) stays
-- with direction, same split as elsewhere (e.g. expenses).
create policy "staff can view attendance in their school" on public.attendance_records
  for select using (
    public.has_role_in_school(school_id, 'school_admin')
    or public.has_role_in_school(school_id, 'teacher')
  );
create policy "staff can record attendance" on public.attendance_records
  for insert with check (
    public.has_role_in_school(school_id, 'school_admin')
    or public.has_role_in_school(school_id, 'teacher')
  );
create policy "school admins update attendance" on public.attendance_records
  for update using (public.has_role_in_school(school_id, 'school_admin'))
  with check (public.has_role_in_school(school_id, 'school_admin'));
create policy "school admins delete attendance" on public.attendance_records
  for delete using (public.has_role_in_school(school_id, 'school_admin'));
