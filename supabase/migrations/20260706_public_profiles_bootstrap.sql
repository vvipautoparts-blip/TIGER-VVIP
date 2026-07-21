-- VVIP TIGER public.profiles bootstrap.
--
-- Establishes the canonical platform profile table before Clerk bridge
-- migrations reference it.
--
-- Identity model:
-- - id is an internal database identifier.
-- - Clerk identity is added later through clerk_user_id.
-- - id is intentionally not linked to auth.users.
--
-- This compatibility migration creates the missing clean-database schema.
-- IF NOT EXISTS preserves an existing public.profiles relation and its rows.
-- It creates no broad RLS policy and authorizes no remote deployment.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid not null default gen_random_uuid() primary key,

  full_name text,
  company text,
  email text,
  phone text,

  account_type text,
  account_category text,

  role text not null default 'dealer',
  is_approved boolean not null default true,

  superior_id uuid
    references public.profiles(id)
    on delete set null,

  subscription text not null default 'basic',

  business_name text,
  location text,
  specialization text,
  business_description text,
  image_url text,

  business_status text not null default 'active',
  allowed_parts_count integer not null default 100,

  representative_phone text,
  company_code text,

  created_at timestamp with time zone not null default now()
);

-- Supabase default privileges include operations that RLS does not constrain,
-- such as TRUNCATE. Start browser-facing roles at deny-by-default; the later
-- Clerk resolver migration grants authenticated only SELECT, INSERT, UPDATE.
revoke all on table public.profiles from public;
revoke all on table public.profiles from anon;
revoke all on table public.profiles from authenticated;

comment on table public.profiles is
  'Canonical VVIP TIGER platform profiles table.';

comment on column public.profiles.id is
  'Internal database profile identifier independent from authentication providers.';
