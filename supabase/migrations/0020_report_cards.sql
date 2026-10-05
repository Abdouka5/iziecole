-- Report cards (bulletins): a free-text nationality on students (shown on
-- the bulletin's info section, nowhere else needs it) and a per-student,
-- per-term "appréciation du conseil de classe" comment. Averages, rank and
-- the rest of the bulletin are computed in the application layer from
-- students/enrollments/class_subjects/grades/attendance_records, which
-- already carry everything else the document needs.

alter table public.students
  add column nationality text;

create table public.report_card_comments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  term_id uuid not null references public.terms (id) on delete cascade,
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, term_id)
);

create index report_card_comments_student_id_idx on public.report_card_comments (student_id);
create index report_card_comments_term_id_idx on public.report_card_comments (term_id);

alter table public.report_card_comments enable row level security;

create policy "staff can view report card comments" on public.report_card_comments
  for select using (
    public.has_role_in_school(school_id, 'school_admin')
    or public.has_role_in_school(school_id, 'teacher')
  );
create policy "parents and students can view their own report card comments" on public.report_card_comments
  for select using (public.can_view_student(student_id));
create policy "school staff add report card comments" on public.report_card_comments
  for insert with check (
    public.has_role_in_school(school_id, 'school_admin')
    or public.has_role_in_school(school_id, 'teacher')
  );
create policy "school staff update report card comments" on public.report_card_comments
  for update using (
    public.has_role_in_school(school_id, 'school_admin')
    or public.has_role_in_school(school_id, 'teacher')
  );
create policy "school staff delete report card comments" on public.report_card_comments
  for delete using (
    public.has_role_in_school(school_id, 'school_admin')
    or public.has_role_in_school(school_id, 'teacher')
  );
