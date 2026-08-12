-- VVIP TIGER IDENTITY-02
-- Forward-only hardening for the authenticated own-profile resolver.
--
-- Security goals:
-- - accept only Clerk-style authenticated subjects;
-- - keep ownership subject-first and never claim legacy rows through p_email;
-- - preserve p_email only as a compatibility fallback for genuinely new profiles;
-- - return the minimum account/display truth required by browser consumers;
-- - preserve the existing authenticated execution privilege while denying public/anon.
--
-- This migration does not reassign identities, edit historical migrations, or
-- authorize any remote/Production database apply.

begin;

-- IDENTITY-02 is intentionally a hardening replacement, not a bootstrap. Requiring
-- the already-reviewed resolver guarantees CREATE OR REPLACE preserves its existing
-- authenticated EXECUTE privilege instead of creating a fresh default-privilege RPC.
do $identity02_precondition$
begin
  if to_regprocedure('public.vvip_resolve_own_profile(text)') is null then
    raise exception 'IDENTITY02_REQUIRES_EXISTING_RESOLVER';
  end if;
end
$identity02_precondition$;

create or replace function public.vvip_resolve_own_profile(p_email text default null)
returns jsonb
language plpgsql security definer set search_path = pg_catalog
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
  v_safe_profile jsonb;
  v_has_unbound_legacy boolean := false;
  v_now timestamptz := statement_timestamp();
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

  if v_clerk_user_id not like 'user\_%' escape '\' then
    return jsonb_build_object(
      'ok', false,
      'status', 'invalid_clerk_subject',
      'safe_message', 'تعذر التحقق من هوية العضوية بشكل آمن.'
    );
  end if;

  select * into v_profile
  from public.profiles
  where clerk_user_id = v_clerk_user_id
  limit 1;

  if found then
    v_safe_profile := jsonb_strip_nulls(jsonb_build_object(
      'id', v_profile.id,
      'email', v_profile.email,
      'full_name', v_profile.full_name,
      'display_name', v_profile.display_name,
      'avatar_url', v_profile.avatar_url,
      'account_status', v_profile.account_status
    ));

    return jsonb_build_object(
      'ok', true,
      'status', 'profile_loaded',
      'profile', v_safe_profile
    );
  end if;

  -- Verified JWT email may detect an unbound legacy row, but it never transfers
  -- ownership. The browser-supplied p_email is deliberately excluded here.
  if length(v_verified_email) > 0 then
    select exists(
      select 1
      from public.profiles
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

  -- Compatibility fallback for genuinely new profiles only. This value is never
  -- used above to locate, claim, update, or reassign an existing profile.
  if v_profile_email is null then
    return jsonb_build_object(
      'ok', false,
      'status', 'missing_email',
      'safe_message', 'تم تسجيل الدخول، لكن نحتاج مزامنة البريد مع ملف العضوية.'
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
      v_profile_email,
      v_clerk_user_id,
      'active',
      v_now,
      v_now + interval '4 months',
      v_now,
      v_now
    ) returning * into v_profile;

    v_safe_profile := jsonb_strip_nulls(jsonb_build_object(
      'id', v_profile.id,
      'email', v_profile.email,
      'full_name', v_profile.full_name,
      'display_name', v_profile.display_name,
      'avatar_url', v_profile.avatar_url,
      'account_status', v_profile.account_status
    ));

    return jsonb_build_object(
      'ok', true,
      'status', 'profile_created',
      'profile', v_safe_profile
    );
  exception
    when unique_violation then
      select * into v_profile
      from public.profiles
      where clerk_user_id = v_clerk_user_id
      limit 1;

      if found then
        v_safe_profile := jsonb_strip_nulls(jsonb_build_object(
          'id', v_profile.id,
          'email', v_profile.email,
          'full_name', v_profile.full_name,
          'display_name', v_profile.display_name,
          'avatar_url', v_profile.avatar_url,
          'account_status', v_profile.account_status
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
  end;
end;
$resolver$;

-- CREATE OR REPLACE preserves the existing authenticated EXECUTE privilege from
-- the prior convergence migration. Keep unauthenticated/browser-default roles denied.
revoke all on function public.vvip_resolve_own_profile(text) from public, anon;

commit;
