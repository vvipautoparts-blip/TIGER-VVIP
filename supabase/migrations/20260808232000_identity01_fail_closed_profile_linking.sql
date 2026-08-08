-- VVIP TIGER IDENTITY-01
-- Fail closed when a verified JWT email collides with an unbound legacy profile.
-- Email is an attribute only; it never transfers profile ownership.

begin;

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
  v_legacy_email_collision boolean := false;
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

  -- Exact external subject is the only automatic ownership binding.
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

  -- A verified email may detect a historical collision, but it cannot claim it.
  if v_jwt_email is not null then
    select exists (
      select 1
      from public.profiles
      where lower(email) = v_jwt_email
        and coalesce(account_status, 'active') <> 'closed'
        and (
          clerk_user_id is null
          or btrim(clerk_user_id) = ''
        )
    )
    into v_legacy_email_collision;

    if v_legacy_email_collision then
      return jsonb_build_object(
        'ok', false,
        'status', 'identity_migration_required',
        'safe_message', 'تم تسجيل الدخول بأمان، لكن ملف العضوية التاريخي يحتاج مراجعة هوية قبل الربط.'
      );
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
  'TIGER VVIP authenticated Clerk profile resolver. JWT subject is authoritative; email collisions fail closed for reviewed migration.';

commit;
