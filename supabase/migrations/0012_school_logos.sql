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
