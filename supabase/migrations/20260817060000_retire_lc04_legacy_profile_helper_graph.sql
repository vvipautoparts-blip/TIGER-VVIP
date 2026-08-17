-- VVIP TIGER — final LC04 legacy profile helper retirement.
-- Forward-only convergence for Production databases that may retain historical LC04
-- helper functions after public.profiles was retired. Exact signatures only; never
-- CASCADE. Any unexpected live dependency must stop deployment fail-closed.

begin;

-- Public enumeration RPC residue has no place in the sovereign profile boundary.
drop function if exists public.lookup_profile_by_email(text) restrict;
drop function if exists public.lookup_profile_by_phone(text) restrict;

-- Remove public copies first in case an environment never completed the historical
-- LC04 SET SCHEMA move. Leaf functions are retired before their prerequisites.
drop function if exists public.can_self_update_profile(uuid, text, boolean, uuid, text, text) restrict;
drop function if exists public.can_publish_owner(uuid) restrict;
drop function if exists public.is_team_member(uuid) restrict;
drop function if exists public.is_field_representative() restrict;
drop function if exists public.is_reviewer() restrict;
drop function if exists public.is_super_admin() restrict;
drop function if exists public.current_user_role() restrict;
drop function if exists public.user_role_for(uuid) restrict;

-- Remove post-LC04 private residue. These helpers were transitional policy machinery
-- backed by public.profiles and must not survive the final Clerk-only authority model.
drop function if exists vvip_private.can_self_update_profile(uuid, text, boolean, uuid, text, text) restrict;
drop function if exists vvip_private.can_publish_owner(uuid) restrict;
drop function if exists vvip_private.is_team_member(uuid) restrict;
drop function if exists vvip_private.is_field_representative() restrict;
drop function if exists vvip_private.is_reviewer() restrict;
drop function if exists vvip_private.is_super_admin() restrict;
drop function if exists vvip_private.current_user_role() restrict;
drop function if exists vvip_private.user_role_for(uuid) restrict;

-- Prove the terminal identity boundary in the same transaction.
do $assert_lc04_final_retirement$
declare
  signature text;
begin
  foreach signature in array array[
    'public.lookup_profile_by_email(text)',
    'public.lookup_profile_by_phone(text)',
    'public.user_role_for(uuid)',
    'public.current_user_role()',
    'public.is_field_representative()',
    'public.is_reviewer()',
    'public.is_super_admin()',
    'public.is_team_member(uuid)',
    'public.can_publish_owner(uuid)',
    'public.can_self_update_profile(uuid, text, boolean, uuid, text, text)',
    'vvip_private.user_role_for(uuid)',
    'vvip_private.current_user_role()',
    'vvip_private.is_field_representative()',
    'vvip_private.is_reviewer()',
    'vvip_private.is_super_admin()',
    'vvip_private.is_team_member(uuid)',
    'vvip_private.can_publish_owner(uuid)',
    'vvip_private.can_self_update_profile(uuid, text, boolean, uuid, text, text)'
  ] loop
    if to_regprocedure(signature) is not null then
      raise exception 'LC04_FINAL_LEGACY_FUNCTION_REMAINS:%', signature;
    end if;
  end loop;

  if to_regclass('public.profiles') is not null then
    raise exception 'LC04_FINAL_PUBLIC_PROFILES_RETURNED';
  end if;

  if to_regclass('public.vvip_clerk_profiles') is null then
    raise exception 'LC04_FINAL_CLERK_PROFILE_AUTHORITY_MISSING';
  end if;
end
$assert_lc04_final_retirement$;

commit;
