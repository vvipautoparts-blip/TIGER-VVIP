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
-- This migration creates schema only.
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

comment on table public.profiles is
  'Canonical VVIP TIGER platform profiles table.';

comment on column public.profiles.id is
  'Internal database profile identifier independent from authentication providers.';
