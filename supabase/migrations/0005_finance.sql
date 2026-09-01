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
