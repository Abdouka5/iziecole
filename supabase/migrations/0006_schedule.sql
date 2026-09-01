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
