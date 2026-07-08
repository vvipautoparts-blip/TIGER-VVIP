-- VVIP TIGER: Remove legacy public.profiles policies based on auth.uid()/id.
-- Reason: Clerk JWT sub values (user_...) are not UUIDs, and legacy auth.uid()=id
-- policies can cause: invalid input syntax for type uuid.
-- This migration removes only old auth.uid()-based policies on public.profiles.
-- It does not remove tables, does not remove vvip_clerk_profiles,
-- and does not add any DELETE policy.

set search_path = public;

-- Legacy policies to remove from public.profiles
-- (auth.uid()/id-based or old profile self policies)
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can update own safe profile fields" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

-- Required policies that should remain active after this migration:
-- - "Clerk users can insert own profile"
-- - "Clerk users can read own profile"
-- - "Clerk users can update own profile"
-- - Admin/representative policies as needed:
--   "Representative can view assigned profiles"
--   "Super admin can manage all profiles"
--   "Super admin can view all profiles"
