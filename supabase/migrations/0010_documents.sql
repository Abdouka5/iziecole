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
