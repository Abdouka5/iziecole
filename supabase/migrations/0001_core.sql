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
