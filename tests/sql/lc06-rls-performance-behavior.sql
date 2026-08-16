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

-- Canonical Clerk profile storage is server-only. The former public.profiles
-- compatibility authority is retired later in the ledger and must stay absent.
do $lc06_profile_authority_final$
declare
  policy_count integer;
  browser_grant_count integer;
  force_rls boolean;
begin
  if to_regclass('public.vvip_clerk_profiles') is null then
    raise exception 'LC06_CLERK_PROFILE_AUTHORITY_MISSING';
  end if;

  if to_regclass('public.profiles') is not null then
    raise exception 'LC06_RETIRED_PUBLIC_PROFILES_RETURNED';
  end if;

  select count(*) into policy_count
  from pg_policies
  where schemaname = 'public'
    and tablename = 'vvip_clerk_profiles';

  if policy_count <> 0 then
    raise exception 'LC06_CLERK_PROFILE_POLICIES_REMAIN:%', policy_count;
  end if;

  select count(*) into browser_grant_count
  from information_schema.table_privileges
  where table_schema = 'public'
    and table_name = 'vvip_clerk_profiles'
    and grantee in ('PUBLIC', 'anon', 'authenticated');

  if browser_grant_count <> 0 then
    raise exception 'LC06_CLERK_PROFILE_BROWSER_GRANTS_REMAIN:%', browser_grant_count;
  end if;

  select c.relforcerowsecurity into force_rls
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'vvip_clerk_profiles';

  if force_rls is distinct from true then
    raise exception 'LC06_CLERK_PROFILE_FORCE_RLS_REQUIRED';
  end if;
end
$lc06_profile_authority_final$;

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

-- Listing base-table reads keep the LC06 role split. Public discovery is layered
-- through the later security-invoker vvip_marketplace_public_feed projection.
do $lc06_listing_read_roles$
declare
  anon_count integer;
  auth_count integer;
  public_feed_security_invoker boolean;
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

  select coalesce(c.reloptions @> array['security_invoker=true']::text[], false)
  into public_feed_security_invoker
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'vvip_marketplace_public_feed'
    and c.relkind = 'v';

  if public_feed_security_invoker is distinct from true then
    raise exception 'LC06_PUBLIC_FEED_SECURITY_INVOKER_REQUIRED';
  end if;
end
$lc06_listing_read_roles$;

-- Every advisor-reported FK that still belongs to a live relation has a covering
-- index. The historical public.profiles index disappears with its retired table.
do $lc06_fk_indexes$
declare
  missing text[] := array[]::text[];
  idx text;
begin
  foreach idx in array array[
    'public.ai_audit_events_approval_id_idx',
    'public.vvip_authority_assignments_role_id_idx',
    'public.vvip_marketplace_favorites_listing_id_idx'
  ] loop
    if to_regclass(idx) is null then
      missing := array_append(missing, idx);
    end if;
  end loop;

  if cardinality(missing) <> 0 then
    raise exception 'LC06_MISSING_LIVE_FK_INDEXES:%', array_to_string(missing, ',');
  end if;

  if to_regclass('public.profiles_superior_id_idx') is not null then
    raise exception 'LC06_RETIRED_PROFILE_INDEX_RETURNED';
  end if;
end
$lc06_fk_indexes$;

rollback;