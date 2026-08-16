-- VVIP TIGER — converge the historical public.profiles table to a read-only
-- Clerk migration bridge. Supabase Auth users are not an account authority.

begin;

drop policy if exists "Supabase users can insert own profile" on public.profiles;
drop policy if exists "Supabase users can read own profile" on public.profiles;
drop policy if exists "Supabase users can update own profile" on public.profiles;
drop policy if exists "Clerk users can read own profile" on public.profiles;

revoke all privileges on table public.profiles from anon;
revoke insert, update, delete on public.profiles from authenticated;
grant select on public.profiles to authenticated;

create policy "Clerk users can read own profile"
on public.profiles
for select
to authenticated
using ((select public.vvip_marketplace_actor_id()) = clerk_user_id);

commit;
