-- VVIP TIGER Clerk Profiles Table
-- Safe independent table for Clerk-authenticated users.
-- This avoids breaking the old public.profiles table that is tied to Supabase Auth users.

set search_path = public;

create table if not exists vvip_clerk_profiles (
  clerk_user_id text primary key,
  email text,
  display_name text,
  avatar_url text,
  account_status text not null default 'active',
  trial_start_at timestamptz not null default now(),
  trial_end_at timestamptz not null default (now() + interval '4 months'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vvip_clerk_profiles_account_status_check
    check (account_status in ('active', 'pending', 'suspended', 'closed'))
);

create index if not exists vvip_clerk_profiles_email_idx
on vvip_clerk_profiles (email);

create index if not exists vvip_clerk_profiles_account_status_idx
on vvip_clerk_profiles (account_status);

alter table vvip_clerk_profiles enable row level security;

drop policy if exists "Clerk users can read own vvip profile"
on vvip_clerk_profiles;

create policy "Clerk users can read own vvip profile"
on vvip_clerk_profiles
for select
using (clerk_user_id = auth.jwt() ->> 'sub');

drop policy if exists "Clerk users can insert own vvip profile"
on vvip_clerk_profiles;

create policy "Clerk users can insert own vvip profile"
on vvip_clerk_profiles
for insert
with check (clerk_user_id = auth.jwt() ->> 'sub');

drop policy if exists "Clerk users can update own vvip profile"
on vvip_clerk_profiles;

create policy "Clerk users can update own vvip profile"
on vvip_clerk_profiles
for update
using (clerk_user_id = auth.jwt() ->> 'sub')
with check (clerk_user_id = auth.jwt() ->> 'sub');
