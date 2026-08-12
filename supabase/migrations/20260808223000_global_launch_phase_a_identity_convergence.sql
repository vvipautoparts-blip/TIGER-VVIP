-- VVIP TIGER GLOBAL LAUNCH PHASE A
-- Forward-only convergence of the existing Production identity/profile/legacy credential surface.
-- No user row is deleted, truncated, reassigned, or auto-linked by email.

begin;

create schema if not exists vvip_private;
revoke all on schema vvip_private from public, anon, authenticated;
grant usage on schema vvip_private to anon, authenticated;

-- Preserve legacy RLS object dependencies by moving existing helpers instead of dropping them.
do $move_helpers$
begin
  if to_regprocedure('public.user_role_for(uuid)') is not null then
    execute 'alter function public.user_role_for(uuid) set schema vvip_private';
  end if;
  if to_regprocedure('public.current_user_role()') is not null then
    execute 'alter function public.current_user_role() set schema vvip_private';
  end if;
  if to_regprocedure('public.is_field_representative()') is not null then
    execute 'alter function public.is_field_representative() set schema vvip_private';
  end if;
  if to_regprocedure('public.is_reviewer()') is not null then
    execute 'alter function public.is_reviewer() set schema vvip_private';
  end if;
  if to_regprocedure('public.is_super_admin()') is not null then
    execute 'alter function public.is_super_admin() set schema vvip_private';
  end if;
  if to_regprocedure('public.is_team_member(uuid)') is not null then
    execute 'alter function public.is_team_member(uuid) set schema vvip_private';
  end if;
  if to_regprocedure('public.can_publish_owner(uuid)') is not null then
    execute 'alter function public.can_publish_owner(uuid) set schema vvip_private';
  end if;
  if to_regprocedure('public.can_self_update_profile(uuid, text, boolean, uuid, text, text)') is not null then
    execute 'alter function public.can_self_update_profile(uuid, text, boolean, uuid, text, text) set schema vvip_private';
  end if;
end
$move_helpers$;

-- Canonicalize moved helpers while keeping the same function OIDs used by existing policies.
do $rewrite_helpers$
begin
  if to_regprocedure('vvip_private.user_role_for(uuid)') is not null then
    execute $sql$
      create or replace function vvip_private.user_role_for(target_user uuid)
      returns text language sql stable security definer set search_path = pg_catalog
      as $fn$
        select coalesce((select p.role from public.profiles p where p.id = target_user limit 1), 'guest');
      $fn$
    $sql$;
    execute 'revoke all on function vvip_private.user_role_for(uuid) from public, anon, authenticated';
    execute 'grant execute on function vvip_private.user_role_for(uuid) to anon, authenticated';
  end if;

  if to_regprocedure('vvip_private.current_user_role()') is not null then
    if to_regprocedure('vvip_private.user_role_for(uuid)') is null then
      raise exception 'GLOBAL_LAUNCH_PHASE_A_HELPER_GRAPH_INCOMPLETE';
    end if;
    execute $sql$
      create or replace function vvip_private.current_user_role()
      returns text language sql stable security definer set search_path = pg_catalog
      as $fn$ select vvip_private.user_role_for(auth.uid()); $fn$
    $sql$;
    execute 'revoke all on function vvip_private.current_user_role() from public, anon, authenticated';
    execute 'grant execute on function vvip_private.current_user_role() to anon, authenticated';
  end if;

  if to_regprocedure('vvip_private.is_field_representative()') is not null then
    execute $sql$
      create or replace function vvip_private.is_field_representative()
      returns boolean language sql stable security definer set search_path = pg_catalog
      as $fn$ select vvip_private.current_user_role() = 'representative'; $fn$
    $sql$;
    execute 'revoke all on function vvip_private.is_field_representative() from public, anon, authenticated';
    execute 'grant execute on function vvip_private.is_field_representative() to anon, authenticated';
  end if;

  if to_regprocedure('vvip_private.is_reviewer()') is not null then
    execute $sql$
      create or replace function vvip_private.is_reviewer()
      returns boolean language sql stable security definer set search_path = pg_catalog
      as $fn$ select vvip_private.current_user_role() in ('super_admin', 'representative'); $fn$
    $sql$;
    execute 'revoke all on function vvip_private.is_reviewer() from public, anon, authenticated';
    execute 'grant execute on function vvip_private.is_reviewer() to anon, authenticated';
  end if;

  if to_regprocedure('vvip_private.is_super_admin()') is not null then
    execute $sql$
      create or replace function vvip_private.is_super_admin()
      returns boolean language sql stable security definer set search_path = pg_catalog
      as $fn$ select vvip_private.current_user_role() = 'super_admin'; $fn$
    $sql$;
    execute 'revoke all on function vvip_private.is_super_admin() from public, anon, authenticated';
    execute 'grant execute on function vvip_private.is_super_admin() to anon, authenticated';
  end if;

  if to_regprocedure('vvip_private.is_team_member(uuid)') is not null then
    execute $sql$
      create or replace function vvip_private.is_team_member(target_user uuid)
      returns boolean language sql stable security definer set search_path = pg_catalog
      as $fn$
        select exists(select 1 from public.profiles p where p.id = target_user and p.superior_id = auth.uid());
      $fn$
    $sql$;
    execute 'revoke all on function vvip_private.is_team_member(uuid) from public, anon, authenticated';
    execute 'grant execute on function vvip_private.is_team_member(uuid) to anon, authenticated';
  end if;

  if to_regprocedure('vvip_private.can_publish_owner(uuid)') is not null then
    execute $sql$
      create or replace function vvip_private.can_publish_owner(target_user uuid)
      returns boolean language sql stable security definer set search_path = pg_catalog
      as $fn$
        select exists(
          select 1 from public.profiles p
          where p.id = target_user
            and p.role = 'dealer'
            and p.is_approved = true
            and coalesce(p.business_status, 'active') = 'active'
            and coalesce(p.subscription, 'basic') <> 'expired'
        );
      $fn$
    $sql$;
    execute 'revoke all on function vvip_private.can_publish_owner(uuid) from public, anon, authenticated';
    execute 'grant execute on function vvip_private.can_publish_owner(uuid) to anon, authenticated';
  end if;

  if to_regprocedure('vvip_private.can_self_update_profile(uuid, text, boolean, uuid, text, text)') is not null then
    execute $sql$
      create or replace function vvip_private.can_self_update_profile(
        target_id uuid,
        new_role text,
        new_is_approved boolean,
        new_superior_id uuid,
        new_subscription text,
        new_business_status text
      )
      returns boolean language sql stable security definer set search_path = pg_catalog
      as $fn$
        select auth.uid() = target_id
          and exists(
            select 1 from public.profiles p
            where p.id = auth.uid()
              and p.role = new_role
              and p.is_approved = new_is_approved
              and p.superior_id is not distinct from new_superior_id
              and p.subscription = new_subscription
              and coalesce(p.business_status, 'active') = coalesce(new_business_status, 'active')
          );
      $fn$
    $sql$;
    execute 'revoke all on function vvip_private.can_self_update_profile(uuid, text, boolean, uuid, text, text) from public, anon, authenticated';
    execute 'grant execute on function vvip_private.can_self_update_profile(uuid, text, boolean, uuid, text, text) to anon, authenticated';
  end if;
end
$rewrite_helpers$;

-- Legacy enumeration and execution machinery must not remain browser RPCs.
do $lock_legacy_rpc$
declare
  signature text;
begin
  foreach signature in array array[
    'lookup_profile_by_email(text)',
    'lookup_profile_by_phone(text)',
    'handle_new_user()',
    'set_profiles_updated_at()',
    'set_vvip_tiger_updated_at()',
    'handle_new_supabase_user()',
    'guard_profile_privileged_fields()',
    'rls_auto_enable()',
    'parts_sync_vehicle_reference_ids()',
    'set_updated_at()'
  ] loop
    if to_regprocedure('public.' || signature) is not null then
      execute 'revoke all on function public.' || signature || ' from public, anon, authenticated';
    end if;
  end loop;
end
$lock_legacy_rpc$;

-- Canonical profile bridge invariants.
create unique index if not exists profiles_clerk_user_id_unique_idx
on public.profiles (clerk_user_id)
where clerk_user_id is not null;

alter table public.profiles enable row level security;
alter table public.profiles force row level security;

revoke all on table public.profiles from public, anon, authenticated;
grant select on table public.profiles to authenticated;

drop policy if exists "Clerk users can read own profile" on public.profiles;
drop policy if exists "Clerk users can insert own profile" on public.profiles;
drop policy if exists "Clerk users can update own profile" on public.profiles;
drop policy if exists "Clerk users can select own profile" on public.profiles;
drop policy if exists "Clerk users can create own profile" on public.profiles;
drop policy if exists "Clerk users can modify own profile" on public.profiles;
drop policy if exists "Supabase users can read own profile" on public.profiles;
drop policy if exists "Supabase users can insert own profile" on public.profiles;
drop policy if exists "Supabase users can update own profile" on public.profiles;
drop policy if exists "Super admin manages profiles" on public.profiles;

create policy "Clerk users can read own profile"
on public.profiles
for select
to authenticated
using ((select auth.jwt() ->> 'sub') = clerk_user_id);

-- Subject-first resolver. Signed JWT email may detect an unbound legacy profile,
-- but it never transfers ownership by email.
create or replace function public.vvip_resolve_own_profile(p_email text default null)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $resolver$
declare
  v_jwt jsonb := coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb);
  v_clerk_user_id text := nullif(v_jwt ->> 'sub', '');
  v_role text := coalesce(v_jwt ->> 'role', '');
  v_verified_email text := lower(nullif(coalesce(
    v_jwt ->> 'email',
    v_jwt ->> 'email_address',
    v_jwt #>> '{primary_email_address,email_address}',
    ''
  ), ''));
  v_profile_email text := coalesce(v_verified_email, lower(nullif(trim(coalesce(p_email, '')), '')));
  v_profile public.profiles%rowtype;
  v_has_unbound_legacy boolean := false;
  v_now timestamptz := statement_timestamp();
begin
  if v_role <> 'authenticated' then
    return jsonb_build_object('ok', false, 'status', 'auth_required', 'safe_message', 'يرجى تسجيل الدخول للمتابعة.');
  end if;

  if v_clerk_user_id is null then
    return jsonb_build_object('ok', false, 'status', 'missing_clerk_subject', 'safe_message', 'تم تسجيل الدخول، لكن ملف العضوية يحتاج مزامنة قصيرة.');
  end if;

  select * into v_profile
  from public.profiles
  where clerk_user_id = v_clerk_user_id
  limit 1;

  if found then
    return jsonb_build_object('ok', true, 'status', 'profile_loaded', 'profile', to_jsonb(v_profile));
  end if;

  if length(v_verified_email) > 0 then
    select exists(
      select 1 from public.profiles
      where lower(email) = v_verified_email
        and nullif(trim(coalesce(clerk_user_id, '')), '') is null
    ) into v_has_unbound_legacy;

    if v_has_unbound_legacy then
      return jsonb_build_object(
        'ok', false,
        'status', 'identity_migration_required',
        'safe_message', 'ملف العضوية القديم يحتاج إعادة تحقق آمنة قبل ربط الهوية.'
      );
    end if;
  end if;

  if v_profile_email is null then
    return jsonb_build_object('ok', false, 'status', 'missing_email', 'safe_message', 'تم تسجيل الدخول، لكن نحتاج مزامنة البريد مع ملف العضوية.');
  end if;

  begin
    insert into public.profiles (
      email, clerk_user_id, account_status, trial_start_at, trial_end_at, created_at, updated_at
    ) values (
      v_profile_email, v_clerk_user_id, 'active', v_now, v_now + interval '4 months', v_now, v_now
    ) returning * into v_profile;

    return jsonb_build_object('ok', true, 'status', 'profile_created', 'profile', to_jsonb(v_profile));
  exception
    when unique_violation then
      select * into v_profile
      from public.profiles
      where clerk_user_id = v_clerk_user_id
      limit 1;

      if found then
        return jsonb_build_object('ok', true, 'status', 'profile_loaded_after_conflict', 'profile', to_jsonb(v_profile));
      end if;

      return jsonb_build_object('ok', false, 'status', 'profile_conflict', 'safe_message', 'حسابك آمن، لكن ملف العضوية يحتاج مراجعة قصيرة عبر Tiger Care.');
  end;
end;
$resolver$;

revoke all on function public.vvip_resolve_own_profile(text) from public, anon, authenticated;
grant execute on function public.vvip_resolve_own_profile(text) to authenticated;

-- Legacy OTP/email verification stores and the retired parallel Clerk profile table
-- are server-only. No row deletion occurs.
do $isolate_tables$
declare
  target text;
  policy_row record;
begin
  foreach target in array array['otp_codes', 'email_verifications', 'vvip_clerk_profiles'] loop
    if to_regclass('public.' || target) is not null then
      execute format('alter table public.%I enable row level security', target);
      execute format('alter table public.%I force row level security', target);

      for policy_row in
        select policyname
        from pg_policies
        where schemaname = 'public' and tablename = target
      loop
        execute format('drop policy %I on public.%I', policy_row.policyname, target);
      end loop;

      execute format('revoke all privileges on table public.%I from public, anon, authenticated', target);
    end if;
  end loop;
end
$isolate_tables$;

commit;
