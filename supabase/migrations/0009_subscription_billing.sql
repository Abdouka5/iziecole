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
