-- Adds address/birth place to students, and lets guardians be recorded as
-- plain contact info (full_name, phone, relationship) instead of requiring
-- an existing iziecole account — most parents won't have a login, they're
-- just contacts captured at registration time. parent_user_id stays around
-- for the (optional) case where that guardian later gets invited and can
-- be linked to their own account.

alter table public.students
  add column address text,
  add column birth_place text;

alter table public.guardians
  alter column parent_user_id drop not null,
  add column full_name text,
  add column phone text;

alter table public.guardians
  add constraint guardians_identity_check
  check (parent_user_id is not null or full_name is not null);

-- The old unique/select-by-parent policies assumed parent_user_id was
-- always set; a parent with their own login still only sees guardians rows
-- that reference their own user id, which is unaffected by this change.
