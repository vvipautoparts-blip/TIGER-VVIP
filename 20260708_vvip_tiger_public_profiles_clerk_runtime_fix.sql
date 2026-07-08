-- VVIP TIGER: public.profiles Clerk runtime fix
-- This migration documents runtime fixes for Clerk + public.profiles integration.
-- These changes were applied manually in Supabase during live testing.
-- Goal: make public.profiles independent from Supabase auth.users while keeping linkage via clerk_user_id.
-- Legacy admin/team/representative policies were temporarily removed and will be rebuilt later in a Clerk-safe way.
-- This migration does not drop tables, does not delete data, does not remove vvip_clerk_profiles,
-- and does not add any DELETE policy.

set search_path = public;

create extension if not exists pgcrypto;

alter table public.profiles
alter column id set default gen_random_uuid();

alter table public.profiles
drop constraint if exists profiles_id_fkey;

-- Remove legacy auth.uid()/id profile self policies
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can update own safe profile fields" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

-- Remove temporary non-Clerk-safe admin/team helper-based policies
drop policy if exists "Representative can view assigned profiles" on public.profiles;
drop policy if exists "Super admin can manage all profiles" on public.profiles;
drop policy if exists "Super admin can view all profiles" on public.profiles;

alter table public.profiles enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'Clerk users can read own profile'
  ) then
    execute $policy$
      create policy "Clerk users can read own profile"
      on public.profiles
      for select
      using (clerk_user_id = (auth.jwt() ->> 'sub'))
    $policy$;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'Clerk users can insert own profile'
  ) then
    execute $policy$
      create policy "Clerk users can insert own profile"
      on public.profiles
      for insert
      with check (clerk_user_id = (auth.jwt() ->> 'sub'))
    $policy$;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'Clerk users can update own profile'
  ) then
    execute $policy$
      create policy "Clerk users can update own profile"
      on public.profiles
      for update
      using (clerk_user_id = (auth.jwt() ->> 'sub'))
      with check (clerk_user_id = (auth.jwt() ->> 'sub'))
    $policy$;
  end if;
end $$;

-- Expected active policies:
-- - Clerk users can insert own profile
-- - Clerk users can read own profile
-- - Clerk users can update own profile
-- Legacy admin/team policies must be rebuilt later with Clerk-safe functions.
