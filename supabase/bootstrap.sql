-- Script de démarrage : colle tout ce fichier dans Supabase SQL Editor
-- et clique Run. Combine, dans l'ordre, toutes les migrations de
-- supabase/migrations/ pour une base vide. Ce n'est PAS un fichier de
-- migration suivi par la CLI (il n'est pas dans supabase/migrations/).

-- ============================================================
-- 0001_core.sql
-- ============================================================
-- Core multi-tenant scaffolding: schools, profiles, memberships, and the
-- RLS helper functions every later migration's policies build on.
-- Tenant isolation model: one database, every tenant-owned table carries a
-- school_id column, and RLS policies gate access through is_member_of_school()
-- / has_role_in_school() below.

create extension if not exists pgcrypto;

create type public.subscription_plan as enum (
  'prescolaire',      -- La Maternelle — 5 000 FCFA/mois
  'elementaire',      -- Le Primaire — 15 000 FCFA/mois
  'college_lycee',    -- Le Collège au Lycée — 25 000 FCFA/mois
  'ecole_complete'    -- Tous niveaux — 35 000 FCFA/mois
);

create type public.membership_role as enum (
  'school_admin',
  'teacher',
  'cashier',
  'parent',
  'student'
);

create table public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  subscription_plan public.subscription_plan not null default 'ecole_complete',
  address text,
  phone text,
  logo_url text,
  created_at timestamptz not null default now()
);

-- One row per auth user, holding app-facing profile data that isn't safe
-- to read directly off auth.users from the client.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  phone text,
  avatar_url text,
  is_super_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- A user can hold one role per school (a teacher at School A can also be a
-- parent at School B, or both teacher and school_admin at the same school).
create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  school_id uuid not null references public.schools (id) on delete cascade,
  role public.membership_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, school_id, role)
);

create index memberships_user_id_idx on public.memberships (user_id);
create index memberships_school_id_idx on public.memberships (school_id);

-- Auto-create a profile row whenever a new auth user signs up.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---- RLS helper functions -------------------------------------------------

create function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select is_super_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

create function public.is_member_of_school(target_school_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_super_admin()
    or exists (
      select 1 from public.memberships
      where user_id = auth.uid() and school_id = target_school_id
    );
$$;

create function public.has_role_in_school(target_school_id uuid, target_role public.membership_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_super_admin()
    or exists (
      select 1 from public.memberships
      where user_id = auth.uid()
        and school_id = target_school_id
        and role = target_role
    );
$$;

-- ---- RLS -------------------------------------------------------------------

alter table public.schools enable row level security;
alter table public.profiles enable row level security;
alter table public.memberships enable row level security;

create policy "members can view their school"
  on public.schools for select
  using (public.is_member_of_school(id));

create policy "school admins can update their school"
  on public.schools for update
  using (public.has_role_in_school(id, 'school_admin'));

create policy "super admins manage schools"
  on public.schools for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "users can view their own profile"
  on public.profiles for select
  using (id = auth.uid());

create policy "users can update their own profile"
  on public.profiles for update
  using (id = auth.uid());

create policy "co-members can view each other's profile"
  on public.profiles for select
  using (
    exists (
      select 1
      from public.memberships mine
      join public.memberships theirs on theirs.school_id = mine.school_id
      where mine.user_id = auth.uid() and theirs.user_id = profiles.id
    )
  );

create policy "users can view their own memberships"
  on public.memberships for select
  using (user_id = auth.uid());

create policy "school admins manage memberships in their school"
  on public.memberships for all
  using (public.has_role_in_school(school_id, 'school_admin'))
  with check (public.has_role_in_school(school_id, 'school_admin'));

-- ============================================================
-- 0002_academic_structure.sql
-- ============================================================
-- Academic structure: school years, levels (Maternelle -> Terminale), classes,
-- subjects and the per-class coefficients used in average/bulletin calculations.

create type public.level_cycle as enum ('maternelle', 'primaire', 'college', 'lycee');

create table public.school_years (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  label text not null, -- e.g. "2025-2026"
  start_date date not null,
  end_date date not null,
  is_current boolean not null default false,
  created_at timestamptz not null default now(),
  unique (school_id, label)
);

create table public.levels (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  name text not null, -- e.g. "CP1", "6ème", "Terminale S"
  cycle public.level_cycle not null,
  display_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  school_year_id uuid not null references public.school_years (id) on delete cascade,
  level_id uuid not null references public.levels (id) on delete restrict,
  name text not null, -- e.g. "6ème A"
  head_teacher_id uuid references public.profiles (id) on delete set null,
  capacity int,
  created_at timestamptz not null default now(),
  unique (school_year_id, name)
);

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  name text not null,
  code text,
  created_at timestamptz not null default now(),
  unique (school_id, name)
);

create table public.class_subjects (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  class_id uuid not null references public.classes (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete cascade,
  teacher_id uuid references public.profiles (id) on delete set null,
  coefficient numeric(4, 2) not null default 1,
  created_at timestamptz not null default now(),
  unique (class_id, subject_id)
);

create index school_years_school_id_idx on public.school_years (school_id);
create index levels_school_id_idx on public.levels (school_id);
create index classes_school_year_id_idx on public.classes (school_year_id);
create index class_subjects_class_id_idx on public.class_subjects (class_id);
create index class_subjects_teacher_id_idx on public.class_subjects (teacher_id);

alter table public.school_years enable row level security;
alter table public.levels enable row level security;
alter table public.classes enable row level security;
alter table public.subjects enable row level security;
alter table public.class_subjects enable row level security;

create policy "members can view school years" on public.school_years
  for select using (public.is_member_of_school(school_id));
create policy "school admins manage school years" on public.school_years
  for all using (public.has_role_in_school(school_id, 'school_admin'))
  with check (public.has_role_in_school(school_id, 'school_admin'));

create policy "members can view levels" on public.levels
  for select using (public.is_member_of_school(school_id));
create policy "school admins manage levels" on public.levels
  for all using (public.has_role_in_school(school_id, 'school_admin'))
  with check (public.has_role_in_school(school_id, 'school_admin'));

create policy "members can view classes" on public.classes
  for select using (public.is_member_of_school(school_id));
create policy "school admins manage classes" on public.classes
  for all using (public.has_role_in_school(school_id, 'school_admin'))
  with check (public.has_role_in_school(school_id, 'school_admin'));

create policy "members can view subjects" on public.subjects
  for select using (public.is_member_of_school(school_id));
create policy "school admins manage subjects" on public.subjects
  for all using (public.has_role_in_school(school_id, 'school_admin'))
  with check (public.has_role_in_school(school_id, 'school_admin'));

create policy "members can view class_subjects" on public.class_subjects
  for select using (public.is_member_of_school(school_id));
create policy "school admins manage class_subjects" on public.class_subjects
  for all using (public.has_role_in_school(school_id, 'school_admin'))
  with check (public.has_role_in_school(school_id, 'school_admin'));

-- ============================================================
-- 0003_students.sql
-- ============================================================
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

-- ============================================================
-- 0004_grades.sql
-- ============================================================
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

-- ============================================================
-- 0005_finance.sql
-- ============================================================
-- Fee schedules, per-student invoices/installments, and recorded payments
-- (on-site cashier collection, or online via Wave / Orange Money).

create table public.fee_schedules (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  school_year_id uuid not null references public.school_years (id) on delete cascade,
  level_id uuid not null references public.levels (id) on delete cascade,
  label text not null, -- e.g. "Scolarité 2025-2026"
  amount numeric(12, 2) not null,
  frequency text not null check (frequency in ('mensuel', 'trimestriel', 'annuel')),
  created_at timestamptz not null default now()
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  fee_schedule_id uuid not null references public.fee_schedules (id) on delete restrict,
  period_label text not null, -- e.g. "Octobre 2025"
  amount_due numeric(12, 2) not null,
  due_date date not null,
  status text not null default 'pending'
    check (status in ('pending', 'partial', 'paid', 'overdue')),
  created_at timestamptz not null default now(),
  unique (student_id, fee_schedule_id, period_label)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  amount numeric(12, 2) not null,
  method text not null
    check (method in ('especes', 'wave', 'orange_money', 'cheque', 'virement')),
  receipt_number text,
  received_by uuid references public.profiles (id) on delete set null,
  paid_at timestamptz not null default now(),
  notes text
);

create index invoices_student_id_idx on public.invoices (student_id);
create index invoices_status_idx on public.invoices (school_id, status);
create index payments_invoice_id_idx on public.payments (invoice_id);
create index payments_student_id_idx on public.payments (student_id);

-- Keep invoice.status in sync whenever a payment is recorded or removed.
create function public.recompute_invoice_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_invoice_id uuid := coalesce(new.invoice_id, old.invoice_id);
  total_paid numeric(12, 2);
  invoice_amount numeric(12, 2);
begin
  select amount_due into invoice_amount from public.invoices where id = target_invoice_id;
  select coalesce(sum(amount), 0) into total_paid from public.payments where invoice_id = target_invoice_id;

  update public.invoices
  set status = case
    when total_paid <= 0 then 'pending'
    when total_paid < invoice_amount then 'partial'
    else 'paid'
  end
  where id = target_invoice_id;

  return coalesce(new, old);
end;
$$;

create trigger payments_recompute_invoice_status
  after insert or update or delete on public.payments
  for each row execute function public.recompute_invoice_status();

alter table public.fee_schedules enable row level security;
alter table public.invoices enable row level security;
alter table public.payments enable row level security;

create policy "members can view fee schedules" on public.fee_schedules
  for select using (public.is_member_of_school(school_id));
create policy "school admins manage fee schedules" on public.fee_schedules
  for all using (public.has_role_in_school(school_id, 'school_admin'))
  with check (public.has_role_in_school(school_id, 'school_admin'));

create policy "staff can view invoices in their school" on public.invoices
  for select using (
    public.has_role_in_school(school_id, 'school_admin')
    or public.has_role_in_school(school_id, 'cashier')
  );
create policy "parents and students can view their own invoices" on public.invoices
  for select using (public.can_view_student(student_id));
create policy "school admins and cashiers manage invoices" on public.invoices
  for all using (
    public.has_role_in_school(school_id, 'school_admin')
    or public.has_role_in_school(school_id, 'cashier')
  )
  with check (
    public.has_role_in_school(school_id, 'school_admin')
    or public.has_role_in_school(school_id, 'cashier')
  );

create policy "staff can view payments in their school" on public.payments
  for select using (
    public.has_role_in_school(school_id, 'school_admin')
    or public.has_role_in_school(school_id, 'cashier')
  );
create policy "parents and students can view their own payments" on public.payments
  for select using (public.can_view_student(student_id));
create policy "school admins and cashiers record payments" on public.payments
  for insert with check (
    public.has_role_in_school(school_id, 'school_admin')
    or public.has_role_in_school(school_id, 'cashier')
  );
create policy "school admins manage payments" on public.payments
  for update using (public.has_role_in_school(school_id, 'school_admin'));
create policy "school admins delete payments" on public.payments
  for delete using (public.has_role_in_school(school_id, 'school_admin'));

-- ============================================================
-- 0006_schedule.sql
-- ============================================================
-- Timetable: rooms and weekly slots per class. Conflict detection (a
-- teacher or room double-booked) is enforced by the unique constraints below
-- and refined with richer overlap checks in the application layer.

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  name text not null,
  capacity int,
  created_at timestamptz not null default now(),
  unique (school_id, name)
);

create table public.timetable_slots (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  school_year_id uuid not null references public.school_years (id) on delete cascade,
  class_id uuid not null references public.classes (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete cascade,
  teacher_id uuid references public.profiles (id) on delete set null,
  room_id uuid references public.rooms (id) on delete set null,
  day_of_week smallint not null check (day_of_week between 0 and 6), -- 0 = lundi
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now(),
  check (end_time > start_time)
);

create index timetable_slots_class_idx on public.timetable_slots (class_id, day_of_week);
create index timetable_slots_teacher_idx on public.timetable_slots (teacher_id, day_of_week);
create unique index timetable_slots_no_teacher_clash
  on public.timetable_slots (school_year_id, teacher_id, day_of_week, start_time)
  where teacher_id is not null;
create unique index timetable_slots_no_room_clash
  on public.timetable_slots (school_year_id, room_id, day_of_week, start_time)
  where room_id is not null;

alter table public.rooms enable row level security;
alter table public.timetable_slots enable row level security;

create policy "members can view rooms" on public.rooms
  for select using (public.is_member_of_school(school_id));
create policy "school admins manage rooms" on public.rooms
  for all using (public.has_role_in_school(school_id, 'school_admin'))
  with check (public.has_role_in_school(school_id, 'school_admin'));

create policy "members can view timetable" on public.timetable_slots
  for select using (public.is_member_of_school(school_id));
create policy "school admins manage timetable" on public.timetable_slots
  for all using (public.has_role_in_school(school_id, 'school_admin'))
  with check (public.has_role_in_school(school_id, 'school_admin'));

-- ============================================================
-- 0007_communication.sql
-- ============================================================
-- Announcements (école -> parents) and direct messaging (direction <-> parents).
-- SMS/WhatsApp/email fan-out for announcements is handled by an application
-- service that reads from this table, not by the database itself.

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  title text not null,
  body text not null,
  audience text not null default 'all' check (audience in ('all', 'level', 'class')),
  level_id uuid references public.levels (id) on delete cascade,
  class_id uuid references public.classes (id) on delete cascade,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  subject text,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index announcements_school_id_idx on public.announcements (school_id, published_at desc);
create index messages_recipient_idx on public.messages (recipient_id, created_at desc);
create index messages_sender_idx on public.messages (sender_id, created_at desc);

alter table public.announcements enable row level security;
alter table public.messages enable row level security;

create policy "members can view announcements for their school" on public.announcements
  for select using (public.is_member_of_school(school_id));
create policy "admins and teachers publish announcements" on public.announcements
  for insert with check (
    public.has_role_in_school(school_id, 'school_admin')
    or public.has_role_in_school(school_id, 'teacher')
  );
create policy "authors and admins manage their announcements" on public.announcements
  for update using (
    author_id = auth.uid() or public.has_role_in_school(school_id, 'school_admin')
  );
create policy "authors and admins delete their announcements" on public.announcements
  for delete using (
    author_id = auth.uid() or public.has_role_in_school(school_id, 'school_admin')
  );

create policy "participants can view their messages" on public.messages
  for select using (sender_id = auth.uid() or recipient_id = auth.uid());
create policy "members can send messages within their school" on public.messages
  for insert with check (
    sender_id = auth.uid() and public.is_member_of_school(school_id)
  );
create policy "recipients can mark messages read" on public.messages
  for update using (recipient_id = auth.uid());

-- ============================================================
-- 0008_payments_receipt_unique.sql
-- ============================================================
-- Two payments should never share the same printed receipt number.
create unique index payments_receipt_number_unique
  on public.payments (receipt_number)
  where receipt_number is not null;

-- ============================================================
-- 0009_subscription_billing.sql
-- ============================================================
-- Billing for a school's own iziecole subscription (school -> iziecole),
-- separate from tuition invoices (parent -> school) in 0005_finance.sql.
-- Only school_admin and super_admin can see this — not teachers, cashiers,
-- or parents.

create table public.subscription_payments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  plan public.subscription_plan not null,
  amount numeric(12, 2) not null,
  period_label text not null, -- e.g. "Octobre 2025"
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'failed', 'cancelled')),
  paytech_ref text unique,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create index subscription_payments_school_id_idx on public.subscription_payments (school_id);

alter table public.subscription_payments enable row level security;

create policy "school admins can view their subscription payments" on public.subscription_payments
  for select using (public.has_role_in_school(school_id, 'school_admin'));
create policy "school admins can create subscription payments" on public.subscription_payments
  for insert with check (public.has_role_in_school(school_id, 'school_admin'));
create policy "super admins manage subscription payments" on public.subscription_payments
  for all using (public.is_super_admin())
  with check (public.is_super_admin());

-- ============================================================
-- 0010_documents.sql
-- ============================================================
-- Document storage: metadata table + a private Storage bucket. Objects are
-- keyed as "<school_id>/<filename>" so storage.objects RLS can gate access
-- by school membership using just the first path segment.

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  uploaded_by uuid references public.profiles (id) on delete set null,
  name text not null,
  path text not null unique,
  size_bytes bigint,
  mime_type text,
  category text not null default 'general'
    check (category in ('general', 'reglement', 'circulaire', 'bulletin', 'autre')),
  created_at timestamptz not null default now()
);

create index documents_school_id_idx on public.documents (school_id);

alter table public.documents enable row level security;

create policy "members can view documents" on public.documents
  for select using (public.is_member_of_school(school_id));
create policy "admins and teachers manage documents" on public.documents
  for all using (
    public.has_role_in_school(school_id, 'school_admin')
    or public.has_role_in_school(school_id, 'teacher')
  )
  with check (
    public.has_role_in_school(school_id, 'school_admin')
    or public.has_role_in_school(school_id, 'teacher')
  );

insert into storage.buckets (id, name, public, file_size_limit)
values ('documents', 'documents', false, 20971520)
on conflict (id) do nothing;

create policy "school members can read their documents"
  on storage.objects for select
  using (
    bucket_id = 'documents'
    and public.is_member_of_school((storage.foldername(name))[1]::uuid)
  );

create policy "admins and teachers upload documents"
  on storage.objects for insert
  with check (
    bucket_id = 'documents'
    and (
      public.has_role_in_school((storage.foldername(name))[1]::uuid, 'school_admin')
      or public.has_role_in_school((storage.foldername(name))[1]::uuid, 'teacher')
    )
  );

create policy "admins delete documents"
  on storage.objects for delete
  using (
    bucket_id = 'documents'
    and public.has_role_in_school((storage.foldername(name))[1]::uuid, 'school_admin')
  );

-- ============================================================
-- 0011_student_details.sql
-- ============================================================
-- Adds address/birth place to students, and lets guardians be recorded as
-- plain contact info (full_name, phone, relationship) instead of requiring
-- an existing iziecole account — most parents won't have a login, they're
-- just contacts captured at registration time. parent_user_id stays around
-- for the (optional) case where that guardian later gets invited and can
-- be linked to their own account.

alter table public.students
  add column address text,
  add column birth_place text;

alter table public.guardians
  alter column parent_user_id drop not null,
  add column full_name text,
  add column phone text;

alter table public.guardians
  add constraint guardians_identity_check
  check (parent_user_id is not null or full_name is not null);

-- The old unique/select-by-parent policies assumed parent_user_id was
-- always set; a parent with their own login still only sees guardians rows
-- that reference their own user id, which is unaffected by this change.

-- ============================================================
-- 0012_school_logos.sql
-- ============================================================
-- Public bucket for school logos (used on receipts/invoices/student sheets).
-- Public on purpose — a school badge isn't sensitive, and a public URL lets
-- every PDF/print page embed it directly with a plain <img src>, no signed
-- URL to generate per view. Objects are keyed "<school_id>/logo.<ext>".

insert into storage.buckets (id, name, public, file_size_limit)
values ('school-logos', 'school-logos', true, 2097152)
on conflict (id) do nothing;

create policy "anyone can view school logos"
  on storage.objects for select
  using (bucket_id = 'school-logos');

create policy "school admins upload their school logo"
  on storage.objects for insert
  with check (
    bucket_id = 'school-logos'
    and public.has_role_in_school((storage.foldername(name))[1]::uuid, 'school_admin')
  );

create policy "school admins replace their school logo"
  on storage.objects for update
  using (
    bucket_id = 'school-logos'
    and public.has_role_in_school((storage.foldername(name))[1]::uuid, 'school_admin')
  );

create policy "school admins delete their school logo"
  on storage.objects for delete
  using (
    bucket_id = 'school-logos'
    and public.has_role_in_school((storage.foldername(name))[1]::uuid, 'school_admin')
  );

-- ============================================================
-- 0013_class_fees_and_expenses.sql
-- ============================================================
-- Per-class monthly tuition fee (replaces the unused "capacity" field on the
-- class creation form), and simple operating expense tracking for Finances.

alter table public.classes add column monthly_fee numeric(12, 2);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  label text not null,
  amount numeric(12, 2) not null check (amount > 0),
  expense_date date not null default current_date,
  recorded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index expenses_school_id_idx on public.expenses (school_id);

alter table public.expenses enable row level security;

create policy "staff can view expenses in their school" on public.expenses
  for select using (
    public.has_role_in_school(school_id, 'school_admin')
    or public.has_role_in_school(school_id, 'cashier')
  );
create policy "school admins and cashiers record expenses" on public.expenses
  for insert with check (
    public.has_role_in_school(school_id, 'school_admin')
    or public.has_role_in_school(school_id, 'cashier')
  );
create policy "school admins delete expenses" on public.expenses
  for delete using (public.has_role_in_school(school_id, 'school_admin'));

-- ============================================================
-- 0014_staff_directory.sql
-- ============================================================
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

-- ============================================================
-- 0015_membership_suspension.sql
-- ============================================================
-- Lets a school admin suspend a user's access to the school without
-- deleting their account or data. Enforced in getCurrentMembership() (a
-- suspended membership is treated the same as no membership at all).

alter table public.memberships add column suspended boolean not null default false;

-- ============================================================
-- 0016_superadmin_console.sql
-- ============================================================
-- Platform-level tables backing the new Super Admin console:
-- a single editable subscription price/duration (Plans & Tarifs),
-- platform-wide announcements shown to every school (Contenu), and a
-- lightweight support ticket inbox (Support).

create table public.platform_settings (
  id int primary key default 1 check (id = 1), -- singleton row
  subscription_price numeric(12, 2) not null default 25000,
  subscription_duration_days int not null default 30,
  updated_at timestamptz not null default now()
);

insert into public.platform_settings (id) values (1)
on conflict (id) do nothing;

alter table public.platform_settings enable row level security;

-- Public (even signed-out) so the landing page and signup can show the
-- current price without exposing anything sensitive.
create policy "platform settings are publicly readable" on public.platform_settings
  for select using (true);
create policy "super admins manage platform settings" on public.platform_settings
  for update using (public.is_super_admin())
  with check (public.is_super_admin());

create table public.platform_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  active boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.platform_announcements enable row level security;

create policy "signed in users can view platform announcements" on public.platform_announcements
  for select using (auth.uid() is not null);
create policy "super admins manage platform announcements" on public.platform_announcements
  for all using (public.is_super_admin())
  with check (public.is_super_admin());

create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  created_by uuid references public.profiles (id) on delete set null,
  subject text not null,
  message text not null,
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now()
);

create index support_tickets_school_id_idx on public.support_tickets (school_id);

alter table public.support_tickets enable row level security;

create policy "school admins view their school's tickets" on public.support_tickets
  for select using (public.has_role_in_school(school_id, 'school_admin'));
create policy "school admins create tickets" on public.support_tickets
  for insert with check (public.has_role_in_school(school_id, 'school_admin'));
create policy "super admins manage all tickets" on public.support_tickets
  for all using (public.is_super_admin())
  with check (public.is_super_admin());

-- ============================================================
-- 0017_superadmin_profiles_visibility.sql
-- ============================================================
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

