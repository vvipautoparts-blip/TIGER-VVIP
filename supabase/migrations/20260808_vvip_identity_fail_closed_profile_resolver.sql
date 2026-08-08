-- VVIP TIGER IDENTITY-01
-- Fail-closed replacement for public.vvip_resolve_own_profile(text).
--
-- Identity authority:
--   auth.jwt()->>'sub' is the ownership anchor.
--
-- Email rules:
--   - JWT email claims may be used only to detect an unbound legacy profile.
--   - p_email is a compatibility profile/contact hint only.
--   - no email value may transfer ownership of an existing profile.
--
-- This migration changes function behavior only. It does not mutate existing
-- rows, tables, indexes, RLS policies, provider configuration, or Production.

begin;

create or replace function public.vvip_resolve_own_profile(p_email text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_jwt jsonb := auth.jwt();
  v_clerk_user_id text := nullif(v_jwt ->> 'sub', '');
  v_role text := coalesce(auth.role(), '');
  v_verified_email text := lower(nullif(coalesce(
    v_jwt ->> 'email',
    v_jwt ->> 'email_address',
    v_jwt #>> '{primary_email_address,email_address}',
    ''
  ), ''));
  v_profile_email text := coalesce(
    v_verified_email,
    lower(nullif(trim(coalesce(p_email, '')), ''))
  );
  v_profile public.profiles%rowtype;
  v_has_unbound_legacy boolean := false;
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

  -- Authoritative path: exact external subject only.
  select *
  into v_profile
  from public.profiles
  where clerk_user_id = v_clerk_user_id
  limit 1;

  if found then
    return jsonb_build_object(
      'ok', true,
      'status', 'profile_loaded',
      'profile', to_jsonb(v_profile)
    );
  end if;

  -- Legacy detection is allowed only from an email carried by the signed JWT.
  -- Browser-supplied p_email is deliberately excluded from this lookup so an
  -- authenticated caller cannot probe or claim legacy accounts by arbitrary
  -- email values.
  if v_verified_email is not null then
    select exists(
      select 1
      from public.profiles
      where lower(email) = v_verified_email
        and nullif(trim(coalesce(clerk_user_id, '')), '') is null
    )
    into v_has_unbound_legacy;

    if v_has_unbound_legacy then
      return jsonb_build_object(
        'ok', false,
        'status', 'identity_migration_required',
        'safe_message', 'ملف العضوية القديم يحتاج إعادة تحقق آمنة قبل ربط الهوية.'
      );
    end if;
  end if;

  -- A new profile may use the compatibility email as profile/contact data,
  -- but ownership is always bound to the authenticated external subject.
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
    )
    values (
      v_profile_email,
      v_clerk_user_id,
      'active',
      v_now,
      v_now + interval '4 months',
      v_now,
      v_now
    )
    returning *
    into v_profile;

    return jsonb_build_object(
      'ok', true,
      'status', 'profile_created',
      'profile', to_jsonb(v_profile)
    );

  exception
    when unique_violation then
      -- Race recovery is subject-only. Email never becomes a fallback key.
      select *
      into v_profile
      from public.profiles
      where clerk_user_id = v_clerk_user_id
      limit 1;

      if found then
        return jsonb_build_object(
          'ok', true,
          'status', 'profile_loaded_after_conflict',
          'profile', to_jsonb(v_profile)
        );
      end if;

      return jsonb_build_object(
        'ok', false,
        'status', 'profile_conflict',
        'safe_message', 'حسابك آمن، لكن ملف العضوية يحتاج مراجعة قصيرة عبر Tiger Care.'
      );
  end;
end;
$$;

revoke all on function public.vvip_resolve_own_profile(text) from public;
revoke all on function public.vvip_resolve_own_profile(text) from anon;
grant execute on function public.vvip_resolve_own_profile(text) to authenticated;

comment on function public.vvip_resolve_own_profile(text) is
  'VVIP TIGER subject-first profile resolver. Existing profile ownership is never transferred by email.';

commit;
