\set ON_ERROR_STOP on

begin;

-- A browser actor must be a Clerk subject. Supabase anonymous UUID subjects fail closed.
select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated","is_anonymous":true}',
  true
);

do $lc06_actor_anonymous$
begin
  if public.vvip_marketplace_actor_id() is not null then
    raise exception 'LC06_EXPECTED_ANONYMOUS_ACTOR_TO_FAIL_CLOSED';
  end if;
end
$lc06_actor_anonymous$;

select set_config(
  'request.jwt.claims',
  '{"sub":"user_lc06_verified_member","role":"authenticated","is_anonymous":false}',
  true
);

do $lc06_actor_clerk$
begin
  if public.vvip_marketplace_actor_id() is distinct from 'user_lc06_verified_member' then
    raise exception 'LC06_EXPECTED_CLERK_ACTOR_ID';
  end if;
end
$lc06_actor_clerk$;

-- Transitional profile policies must never remain PUBLIC.
do $lc06_clerk_profile_policies$
declare
  bad_count integer;
  expected_count integer;
begin
  select count(*) into bad_count
  from pg_policies
  where schemaname = 'public'
    and tablename = 'vvip_clerk_profiles'
    and 'public' = any(roles);

  if bad_count <> 0 then
    raise exception 'LC06_PUBLIC_CLERK_PROFILE_POLICY_REMAINS:%', bad_count;
  end if;

  select count(*) into expected_count
  from pg_policies
  where schemaname = 'public'
    and tablename = 'vvip_clerk_profiles'
    and roles = array['authenticated']::name[]
    and policyname in (
      'Clerk users can read own vvip profile',
      'Clerk users can insert own vvip profile',
      'Clerk users can update own vvip profile'
    );

  if expected_count <> 3 then
    raise exception 'LC06_EXPECTED_THREE_AUTHENTICATED_CLERK_PROFILE_POLICIES:%', expected_count;
  end if;
end
$lc06_clerk_profile_policies$;

-- The media table must not have an ALL owner policy because ALL overlaps SELECT.
do $lc06_media_policy_overlap$
declare
  all_count integer;
  write_count integer;
begin
  select count(*) into all_count
  from pg_policies
  where schemaname = 'public'
    and tablename = 'vvip_marketplace_listing_media'
    and cmd = 'ALL'
    and 'authenticated' = any(roles);

  if all_count <> 0 then
    raise exception 'LC06_MEDIA_ALL_POLICY_OVERLAP_REMAINS:%', all_count;
  end if;

  select count(*) into write_count
  from pg_policies
  where schemaname = 'public'
    and tablename = 'vvip_marketplace_listing_media'
    and 'authenticated' = any(roles)
    and cmd in ('INSERT', 'UPDATE', 'DELETE')
    and policyname in (
      'vvip_marketplace_media_owner_insert',
      'vvip_marketplace_media_owner_update',
      'vvip_marketplace_media_owner_delete'
    );

  if write_count <> 3 then
    raise exception 'LC06_EXPECTED_THREE_MEDIA_WRITE_POLICIES:%', write_count;
  end if;
end
$lc06_media_policy_overlap$;

-- Listing reads are intentionally public for ACTIVE listings, but roles must not overlap.
do $lc06_listing_read_roles$
declare
  anon_count integer;
  auth_count integer;
begin
  select count(*) into anon_count
  from pg_policies
  where schemaname = 'public'
    and tablename = 'vvip_marketplace_listings'
    and cmd = 'SELECT'
    and roles = array['anon']::name[]
    and policyname = 'vvip_marketplace_public_read_active';

  select count(*) into auth_count
  from pg_policies
  where schemaname = 'public'
    and tablename = 'vvip_marketplace_listings'
    and cmd = 'SELECT'
    and roles = array['authenticated']::name[]
    and policyname = 'vvip_marketplace_authenticated_read';

  if anon_count <> 1 or auth_count <> 1 then
    raise exception 'LC06_LISTING_READ_POLICY_ROLE_SPLIT_INVALID:anon=%,auth=%', anon_count, auth_count;
  end if;
end
$lc06_listing_read_roles$;

-- Every advisor-reported modern FK has a covering index after LC06.
do $lc06_fk_indexes$
declare
  missing text[] := array[]::text[];
  idx text;
begin
  foreach idx in array array[
    'public.ai_audit_events_approval_id_idx',
    'public.profiles_superior_id_idx',
    'public.vvip_authority_assignments_role_id_idx',
    'public.vvip_marketplace_favorites_listing_id_idx'
  ] loop
    if to_regclass(idx) is null then
      missing := array_append(missing, idx);
    end if;
  end loop;

  if cardinality(missing) <> 0 then
    raise exception 'LC06_MISSING_FK_INDEXES:%', array_to_string(missing, ',');
  end if;
end
$lc06_fk_indexes$;

rollback;
