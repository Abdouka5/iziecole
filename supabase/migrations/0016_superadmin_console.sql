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
