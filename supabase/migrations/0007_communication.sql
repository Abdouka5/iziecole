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
