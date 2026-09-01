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
