-- VVIP TIGER - Atomic Profile Resolver RPC
-- Purpose:
-- Resolve the authenticated user's profile through Clerk JWT in one safe backend operation.
--
-- Official identity source:
-- auth.jwt()->>'sub' = public.profiles.clerk_user_id
--
-- Security:
-- No anon access.
-- No delete policy.
-- No service_role in frontend.
-- Email is only a legacy recovery hint, not the primary identity source.
-- The function never returns tokens or secrets.

begin;

alter table public.profiles enable row level security;

grant usage on schema public to authenticated;
grant select, insert, update on table public.profiles to authenticated;
revoke delete on table public.profiles from authenticated;

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

create policy "Clerk users can insert own profile"
on public.profiles
for insert
to authenticated
with check (
  (auth.jwt() ->> 'sub') = clerk_user_id
);

create policy "Clerk users can update own profile"
on public.profiles
for update
to authenticated
using (
  (auth.jwt() ->> 'sub') = clerk_user_id
)
with check (
  (auth.jwt() ->> 'sub') = clerk_user_id
);

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
  v_jwt_email text := lower(nullif(coalesce(
    v_jwt ->> 'email',
    v_jwt ->> 'email_address',
    v_jwt #>> '{primary_email_address,email_address}',
    ''
  ), ''));
  v_email text := lower(nullif(trim(coalesce(v_jwt_email, p_email, '')), ''));
  v_profile public.profiles%rowtype;
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

  if v_email is not null then
    update public.profiles
    set
      clerk_user_id = v_clerk_user_id,
      updated_at = v_now
    where lower(email) = v_email
      and (
        clerk_user_id is null
        or clerk_user_id = ''
        or clerk_user_id = v_clerk_user_id
      )
    returning *
    into v_profile;

    if found then
      return jsonb_build_object(
        'ok', true,
        'status', 'legacy_profile_recovered',
        'profile', to_jsonb(v_profile)
      );
    end if;
  end if;

  if v_email is null then
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
      v_email,
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

commit;
