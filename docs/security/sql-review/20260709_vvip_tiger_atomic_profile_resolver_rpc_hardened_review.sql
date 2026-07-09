-- VVIP TIGER - Hardened Atomic Profile Resolver RPC
-- REVIEW ONLY — DO NOT APPLY TO PRODUCTION BEFORE MANUAL BACKUP AND FINAL REVIEW
--
-- Purpose:
-- Harden the Clerk/Supabase profile resolver before production use.
--
-- Important:
-- This file is intentionally created as a review migration.
-- Do not paste into Supabase SQL Editor until reviewed and approved.
--
-- Security goals:
-- 1) Clerk JWT sub is the only identity authority.
-- 2) p_email is never used to prove ownership.
-- 3) No broad direct update access to public.profiles for authenticated users.
-- 4) The RPC returns only a safe profile JSON, not the full row.
-- 5) No anon execute.
-- 6) No delete path.

begin;

-- ------------------------------------------------------------
-- 1) Ensure required profile bridge columns exist
-- ------------------------------------------------------------

alter table public.profiles add column if not exists clerk_user_id text;
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists account_status text not null default 'active';
alter table public.profiles add column if not exists trial_start_at timestamptz;
alter table public.profiles add column if not exists trial_end_at timestamptz;
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

create unique index if not exists profiles_clerk_user_id_unique_idx
on public.profiles (clerk_user_id)
where clerk_user_id is not null;

create index if not exists profiles_email_idx
on public.profiles (email);

create index if not exists profiles_account_status_idx
on public.profiles (account_status);

-- ------------------------------------------------------------
-- 2) RLS and direct table privileges
-- ------------------------------------------------------------

alter table public.profiles enable row level security;

grant usage on schema public to authenticated;

-- Users may read their own profile through RLS.
grant select on table public.profiles to authenticated;

-- Direct write access is intentionally removed.
-- Profile creation/recovery must go through the hardened RPC.
revoke insert, update, delete on table public.profiles from authenticated;

-- ------------------------------------------------------------
-- 3) Remove old Clerk profile policies that allowed direct writes
-- ------------------------------------------------------------

drop policy if exists "Clerk users can read own profile" on public.profiles;
drop policy if exists "Clerk users can insert own profile" on public.profiles;
drop policy if exists "Clerk users can update own profile" on public.profiles;
drop policy if exists "Clerk users can select own profile" on public.profiles;
drop policy if exists "Clerk users can create own profile" on public.profiles;
drop policy if exists "Clerk users can modify own profile" on public.profiles;

create policy "Clerk users can read own profile"
on public.profiles
for select
to authenticated
using (
  (auth.jwt() ->> 'sub') = clerk_user_id
);

-- ------------------------------------------------------------
-- 4) Hardened profile resolver
-- ------------------------------------------------------------

create or replace function public.vvip_resolve_own_profile(p_email text default null)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_jwt jsonb := auth.jwt();
  v_role text := coalesce(auth.role(), '');
  v_clerk_user_id text := nullif(v_jwt ->> 'sub', '');

  -- Trusted email comes only from JWT.
  v_jwt_email text := lower(nullif(trim(coalesce(
    v_jwt ->> 'email',
    v_jwt ->> 'email_address',
    v_jwt #>> '{primary_email_address,email_address}',
    ''
  )), ''));

  -- Client email is accepted only as a non-authoritative hint.
  -- It is not used to claim or recover an existing profile.
  v_client_email_hint text := lower(nullif(trim(coalesce(p_email, '')), ''));

  v_profile public.profiles%rowtype;
  v_safe_profile jsonb;
  v_now timestamptz := now();
begin
  if v_role <> 'authenticated' then
    return jsonb_build_object(
      'ok', false,
      'status', 'auth_required',
      'safe_message', 'يرجى تسجيل الدخول للمتابعة.'
    );
  end if;

  if v_clerk_user_id is null then
    return jsonb_build_object(
      'ok', false,
      'status', 'missing_clerk_subject',
      'safe_message', 'تم تسجيل الدخول، لكن ملف العضوية يحتاج مزامنة قصيرة.'
    );
  end if;

  -- 1) Load profile by Clerk identity first.
  select *
  into v_profile
  from public.profiles
  where clerk_user_id = v_clerk_user_id
  limit 1;

  if found then
    v_safe_profile := jsonb_strip_nulls(jsonb_build_object(
      'id', v_profile.id,
      'clerk_user_id', v_profile.clerk_user_id,
      'email', v_profile.email,
      'display_name', v_profile.display_name,
      'avatar_url', v_profile.avatar_url,
      'account_status', v_profile.account_status,
      'trial_start_at', v_profile.trial_start_at,
      'trial_end_at', v_profile.trial_end_at,
      'created_at', v_profile.created_at,
      'updated_at', v_profile.updated_at
    ));

    return jsonb_build_object(
      'ok', true,
      'status', 'profile_loaded',
      'profile', v_safe_profile
    );
  end if;

  -- 2) Legacy recovery is allowed only with trusted JWT email.
  -- p_email is not used as ownership proof.
  if v_jwt_email is not null then
    update public.profiles
    set
      clerk_user_id = v_clerk_user_id,
      updated_at = v_now
    where lower(email) = v_jwt_email
      and coalesce(account_status, 'active') <> 'closed'
      and (
        clerk_user_id is null
        or btrim(clerk_user_id) = ''
        or clerk_user_id = v_clerk_user_id
      )
    returning *
    into v_profile;

    if found then
      v_safe_profile := jsonb_strip_nulls(jsonb_build_object(
        'id', v_profile.id,
        'clerk_user_id', v_profile.clerk_user_id,
        'email', v_profile.email,
        'display_name', v_profile.display_name,
        'avatar_url', v_profile.avatar_url,
        'account_status', v_profile.account_status,
        'trial_start_at', v_profile.trial_start_at,
        'trial_end_at', v_profile.trial_end_at,
        'created_at', v_profile.created_at,
        'updated_at', v_profile.updated_at
      ));

      return jsonb_build_object(
        'ok', true,
        'status', 'legacy_profile_recovered',
        'profile', v_safe_profile
      );
    end if;
  end if;

  -- 3) If JWT email is missing, do not create or claim using p_email.
  if v_jwt_email is null then
    return jsonb_build_object(
      'ok', false,
      'status', 'missing_verified_email',
      'email_hint_received', v_client_email_hint is not null,
      'safe_message', 'تم تسجيل الدخول، لكن نحتاج مزامنة البريد الموثق مع ملف العضوية.'
    );
  end if;

  -- 4) Create a new profile using trusted JWT identity only.
  begin
    insert into public.profiles (
      email,
      clerk_user_id,
      account_status,
      trial_start_at,
      trial_end_at,
      created_at,
      updated_at
    )
    values (
      v_jwt_email,
      v_clerk_user_id,
      'active',
      v_now,
      v_now + interval '4 months',
      v_now,
      v_now
    )
    returning *
    into v_profile;

    v_safe_profile := jsonb_strip_nulls(jsonb_build_object(
      'id', v_profile.id,
      'clerk_user_id', v_profile.clerk_user_id,
      'email', v_profile.email,
      'display_name', v_profile.display_name,
      'avatar_url', v_profile.avatar_url,
      'account_status', v_profile.account_status,
      'trial_start_at', v_profile.trial_start_at,
      'trial_end_at', v_profile.trial_end_at,
      'created_at', v_profile.created_at,
      'updated_at', v_profile.updated_at
    ));

    return jsonb_build_object(
      'ok', true,
      'status', 'profile_created',
      'profile', v_safe_profile
    );

  exception
    when unique_violation then
      select *
      into v_profile
      from public.profiles
      where clerk_user_id = v_clerk_user_id
      limit 1;

      if found then
        v_safe_profile := jsonb_strip_nulls(jsonb_build_object(
          'id', v_profile.id,
          'clerk_user_id', v_profile.clerk_user_id,
          'email', v_profile.email,
          'display_name', v_profile.display_name,
          'avatar_url', v_profile.avatar_url,
          'account_status', v_profile.account_status,
          'trial_start_at', v_profile.trial_start_at,
          'trial_end_at', v_profile.trial_end_at,
          'created_at', v_profile.created_at,
          'updated_at', v_profile.updated_at
        ));

        return jsonb_build_object(
          'ok', true,
          'status', 'profile_loaded_after_conflict',
          'profile', v_safe_profile
        );
      end if;

      return jsonb_build_object(
        'ok', false,
        'status', 'profile_conflict',
        'safe_message', 'حسابك آمن، لكن ملف العضوية يحتاج مراجعة قصيرة عبر Tiger Care.'
      );

    when others then
      return jsonb_build_object(
        'ok', false,
        'status', 'profile_resolver_safe_failure',
        'safe_message', 'نقوم بتجهيز ملف عضويتك بأمان. يرجى المحاولة بعد لحظات.'
      );
  end;
end;
$$;

revoke all on function public.vvip_resolve_own_profile(text) from public;
revoke all on function public.vvip_resolve_own_profile(text) from anon;
revoke all on function public.vvip_resolve_own_profile(text) from authenticated;
grant execute on function public.vvip_resolve_own_profile(text) to authenticated;

comment on function public.vvip_resolve_own_profile(text) is
'VVIP TIGER hardened Clerk profile resolver. REVIEW ONLY until manually approved.';

commit;
