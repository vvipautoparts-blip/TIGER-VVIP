-- TIGER VVIP LC-04 Production legacy RPC hardening.
-- Purpose: converge the observed Production legacy SECURITY DEFINER surface to a
-- fail-closed, non-exposed helper graph while preserving RLS object dependencies.
-- This migration does not authorize Production execution, seed authority, or deploy code.

begin;

create schema if not exists vvip_private;
revoke all on schema vvip_private from public, anon, authenticated;
grant usage on schema vvip_private to anon, authenticated;

-- Move only legacy RLS helper functions that actually exist. ALTER FUNCTION ...
-- SET SCHEMA preserves the function OID, so pg_policy dependencies keep referring
-- to the same object. An environment that does not contain a legacy helper must not
-- acquire that helper merely because this convergence migration ran.
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

-- Fail closed on a partially present dependency graph. This prevents a drifted
-- environment from getting a helper whose body points to a missing prerequisite.
do $validate_helper_graph$
begin
  if to_regprocedure('vvip_private.current_user_role()') is not null
     and to_regprocedure('vvip_private.user_role_for(uuid)') is null then
    raise exception 'LC04_HELPER_GRAPH_INCOMPLETE: current_user_role requires user_role_for';
  end if;

  if (
    to_regprocedure('vvip_private.is_field_representative()') is not null
    or to_regprocedure('vvip_private.is_reviewer()') is not null
    or to_regprocedure('vvip_private.is_super_admin()') is not null
  ) and to_regprocedure('vvip_private.current_user_role()') is null then
    raise exception 'LC04_HELPER_GRAPH_INCOMPLETE: role predicates require current_user_role';
  end if;
end
$validate_helper_graph$;

-- Canonicalize only helpers that were actually present/moved. Each dynamic CREATE
-- OR REPLACE keeps the existing function identity and applies a fixed search_path.
do $rewrite_helpers$
begin
  if to_regprocedure('vvip_private.user_role_for(uuid)') is not null then
    execute $sql$
      create or replace function vvip_private.user_role_for(target_user uuid)
      returns text
      language sql
      stable
      security definer
      set search_path = pg_catalog
      as $function$
        select coalesce(
          (select p.role from public.profiles p where p.id = target_user limit 1),
          'guest'
        );
      $function$
    $sql$;
    execute 'revoke all on function vvip_private.user_role_for(uuid) from public, anon, authenticated';
    execute 'grant execute on function vvip_private.user_role_for(uuid) to anon, authenticated';
  end if;

  if to_regprocedure('vvip_private.current_user_role()') is not null then
    execute $sql$
      create or replace function vvip_private.current_user_role()
      returns text
      language sql
      stable
      security definer
      set search_path = pg_catalog
      as $function$
        select vvip_private.user_role_for(auth.uid());
      $function$
    $sql$;
    execute 'revoke all on function vvip_private.current_user_role() from public, anon, authenticated';
    execute 'grant execute on function vvip_private.current_user_role() to anon, authenticated';
  end if;

  if to_regprocedure('vvip_private.is_field_representative()') is not null then
    execute $sql$
      create or replace function vvip_private.is_field_representative()
      returns boolean
      language sql
      stable
      security definer
      set search_path = pg_catalog
      as $function$
        select vvip_private.current_user_role() = 'representative';
      $function$
    $sql$;
    execute 'revoke all on function vvip_private.is_field_representative() from public, anon, authenticated';
    execute 'grant execute on function vvip_private.is_field_representative() to anon, authenticated';
  end if;

  if to_regprocedure('vvip_private.is_reviewer()') is not null then
    execute $sql$
      create or replace function vvip_private.is_reviewer()
      returns boolean
      language sql
      stable
      security definer
      set search_path = pg_catalog
      as $function$
        select vvip_private.current_user_role() in ('super_admin', 'representative');
      $function$
    $sql$;
    execute 'revoke all on function vvip_private.is_reviewer() from public, anon, authenticated';
    execute 'grant execute on function vvip_private.is_reviewer() to anon, authenticated';
  end if;

  if to_regprocedure('vvip_private.is_super_admin()') is not null then
    execute $sql$
      create or replace function vvip_private.is_super_admin()
      returns boolean
      language sql
      stable
      security definer
      set search_path = pg_catalog
      as $function$
        select vvip_private.current_user_role() = 'super_admin';
      $function$
    $sql$;
    execute 'revoke all on function vvip_private.is_super_admin() from public, anon, authenticated';
    execute 'grant execute on function vvip_private.is_super_admin() to anon, authenticated';
  end if;

  if to_regprocedure('vvip_private.is_team_member(uuid)') is not null then
    execute $sql$
      create or replace function vvip_private.is_team_member(target_user uuid)
      returns boolean
      language sql
      stable
      security definer
      set search_path = pg_catalog
      as $function$
        select exists (
          select 1
          from public.profiles p
          where p.id = target_user
            and p.superior_id = auth.uid()
        );
      $function$
    $sql$;
    execute 'revoke all on function vvip_private.is_team_member(uuid) from public, anon, authenticated';
    execute 'grant execute on function vvip_private.is_team_member(uuid) to anon, authenticated';
  end if;

  if to_regprocedure('vvip_private.can_publish_owner(uuid)') is not null then
    execute $sql$
      create or replace function vvip_private.can_publish_owner(target_user uuid)
      returns boolean
      language sql
      stable
      security definer
      set search_path = pg_catalog
      as $function$
        select exists (
          select 1
          from public.profiles p
          where p.id = target_user
            and p.role = 'dealer'
            and p.is_approved = true
            and coalesce(p.business_status, 'active') = 'active'
            and coalesce(p.subscription, 'basic') <> 'expired'
        );
      $function$
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
      returns boolean
      language sql
      stable
      security definer
      set search_path = pg_catalog
      as $function$
        select auth.uid() = target_id
          and exists (
            select 1
            from public.profiles p
            where p.id = auth.uid()
              and p.role = new_role
              and p.is_approved = new_is_approved
              and p.superior_id is not distinct from new_superior_id
              and p.subscription = new_subscription
              and coalesce(p.business_status, 'active') = coalesce(new_business_status, 'active')
          );
      $function$
    $sql$;
    execute 'revoke all on function vvip_private.can_self_update_profile(uuid, text, boolean, uuid, text, text) from public, anon, authenticated';
    execute 'grant execute on function vvip_private.can_self_update_profile(uuid, text, boolean, uuid, text, text) to anon, authenticated';
  end if;
end
$rewrite_helpers$;

-- Legacy enumeration/trigger/event-trigger helpers stay out of browser RPC use.
do $legacy_rpc_lock$
begin
  if to_regprocedure('public.lookup_profile_by_email(text)') is not null then
    execute 'revoke all on function public.lookup_profile_by_email(text) from public, anon, authenticated';
  end if;
  if to_regprocedure('public.lookup_profile_by_phone(text)') is not null then
    execute 'revoke all on function public.lookup_profile_by_phone(text) from public, anon, authenticated';
  end if;
  if to_regprocedure('public.handle_new_user()') is not null then
    execute 'alter function public.handle_new_user() set search_path = pg_catalog';
    execute 'revoke all on function public.handle_new_user() from public, anon, authenticated';
  end if;
  if to_regprocedure('public.set_profiles_updated_at()') is not null then
    execute 'alter function public.set_profiles_updated_at() set search_path = pg_catalog';
    execute 'revoke all on function public.set_profiles_updated_at() from public, anon, authenticated';
  end if;
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'alter function public.rls_auto_enable() set search_path = pg_catalog';
    execute 'revoke all on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
  if to_regprocedure('public.parts_sync_vehicle_reference_ids()') is not null then
    execute 'alter function public.parts_sync_vehicle_reference_ids() set search_path = pg_catalog';
    execute 'revoke all on function public.parts_sync_vehicle_reference_ids() from public, anon, authenticated';
  end if;
  if to_regprocedure('public.set_updated_at()') is not null then
    execute 'alter function public.set_updated_at() set search_path = pg_catalog';
    execute 'revoke all on function public.set_updated_at() from public, anon, authenticated';
  end if;
end
$legacy_rpc_lock$;

-- Browser code already resolves profiles through this RPC. Direct profile writes are
-- removed so identity recovery/creation has one controlled backend boundary.
grant select on table public.profiles to authenticated;
revoke insert, update, delete on table public.profiles from authenticated;

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
  (select auth.jwt() ->> 'sub') = clerk_user_id
);

create or replace function public.vvip_resolve_own_profile(p_email text default null)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_jwt jsonb := auth.jwt();
  v_role text := coalesce(auth.role(), '');
  v_clerk_user_id text := nullif(v_jwt ->> 'sub', '');
  v_jwt_email text := lower(nullif(trim(coalesce(
    v_jwt ->> 'email',
    v_jwt ->> 'email_address',
    v_jwt #>> '{primary_email_address,email_address}',
    ''
  )), ''));
  v_client_email_hint text := lower(nullif(trim(coalesce(p_email, '')), ''));
  v_profile public.profiles%rowtype;
  v_safe_profile jsonb;
  v_now timestamptz := statement_timestamp();
begin
  if v_role <> 'authenticated' then
    return jsonb_build_object(
      'ok', false,
      'status', 'auth_required',
      'safe_message', 'يرجى تسجيل الدخول للمتابعة.'
    );
  end if;

  if v_clerk_user_id is null or v_clerk_user_id not like 'user\_%' escape '\' then
    return jsonb_build_object(
      'ok', false,
      'status', 'invalid_clerk_subject',
      'safe_message', 'تم تسجيل الدخول، لكن هوية الحساب تحتاج مزامنة قصيرة.'
    );
  end if;

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
    return jsonb_build_object('ok', true, 'status', 'profile_loaded', 'profile', v_safe_profile);
  end if;

  -- Only an email claim carried by the verified JWT may claim a legacy profile.
  -- p_email remains a UX hint and is never ownership evidence.
  if v_jwt_email is not null then
    update public.profiles
    set clerk_user_id = v_clerk_user_id,
        updated_at = v_now
    where lower(email) = v_jwt_email
      and coalesce(account_status, 'active') <> 'closed'
      and (
        clerk_user_id is null
        or btrim(clerk_user_id) = ''
        or clerk_user_id = v_clerk_user_id
      )
    returning * into v_profile;

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
      return jsonb_build_object('ok', true, 'status', 'legacy_profile_recovered', 'profile', v_safe_profile);
    end if;
  end if;

  if v_jwt_email is null then
    return jsonb_build_object(
      'ok', false,
      'status', 'missing_verified_email',
      'email_hint_received', v_client_email_hint is not null,
      'safe_message', 'تم تسجيل الدخول، لكن نحتاج مزامنة البريد الموثق مع ملف العضوية.'
    );
  end if;

  begin
    insert into public.profiles (
      email,
      clerk_user_id,
      account_status,
      trial_start_at,
      trial_end_at,
      created_at,
      updated_at
    ) values (
      v_jwt_email,
      v_clerk_user_id,
      'active',
      v_now,
      v_now + interval '4 months',
      v_now,
      v_now
    )
    returning * into v_profile;

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
    return jsonb_build_object('ok', true, 'status', 'profile_created', 'profile', v_safe_profile);
  exception
    when unique_violation then
      select * into v_profile
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
        return jsonb_build_object('ok', true, 'status', 'profile_loaded_after_conflict', 'profile', v_safe_profile);
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
        'safe_message', 'تعذر تجهيز ملف العضوية حاليًا. يرجى المحاولة مجددًا.'
      );
  end;
end;
$function$;

revoke all on function public.vvip_resolve_own_profile(text) from public, anon, authenticated;
grant execute on function public.vvip_resolve_own_profile(text) to authenticated;

comment on function public.vvip_resolve_own_profile(text) is
  'TIGER VVIP authenticated Clerk profile resolver. JWT claims are authoritative; client email is hint-only.';

commit;
