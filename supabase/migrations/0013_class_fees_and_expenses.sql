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
