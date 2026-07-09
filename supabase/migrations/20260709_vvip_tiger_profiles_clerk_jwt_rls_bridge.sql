-- VVIP TIGER Clerk -> Supabase JWT/RLS Bridge Stabilization
-- Official source of truth: public.profiles + clerk_user_id
-- Clerk user id is expected from auth.jwt()->>'sub'
-- This migration is documentation and review material only.
-- It must be applied manually in Supabase after approval.

alter table public.profiles enable row level security;

drop policy if exists "Clerk users can insert own profile" on public.profiles;
drop policy if exists "Clerk users can read own profile" on public.profiles;
drop policy if exists "Clerk users can update own profile" on public.profiles;

create policy "Clerk users can read own profile"
  on public.profiles
  for select
  to authenticated
  using ((select auth.jwt() ->> 'sub') = clerk_user_id);

create policy "Clerk users can insert own profile"
  on public.profiles
  for insert
  to authenticated
  with check ((select auth.jwt() ->> 'sub') = clerk_user_id);

create policy "Clerk users can update own profile"
  on public.profiles
  for update
  to authenticated
  using ((select auth.jwt() ->> 'sub') = clerk_user_id)
  with check ((select auth.jwt() ->> 'sub') = clerk_user_id);
