-- Lets a school admin suspend a user's access to the school without
-- deleting their account or data. Enforced in getCurrentMembership() (a
-- suspended membership is treated the same as no membership at all).

alter table public.memberships add column suspended boolean not null default false;
