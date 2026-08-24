\set ON_ERROR_STOP on

begin;

reset role;
select (
  has_function_privilege('authenticated', 'public.vvip_social_search_discovery(text,integer)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.vvip_social_discover_profiles(integer)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.vvip_social_search_discovery(text,integer)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.vvip_social_discover_profiles(integer)', 'EXECUTE')
) as search_rpc_boundary
\gset
\if :search_rpc_boundary
  \echo P0_SEARCH_RPC_BOUNDARY=PASS
\else
  \echo P0_SEARCH_RPC_BOUNDARY=FAIL
  select 1 / 0;
\endif

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_searchalice01"}', true);
select public.vvip_upsert_my_social_profile(
  'Search Alice', null, null, 'Amman', null, 'Search proof actor'
) as alice_profile
\gset
select (:'alice_profile'::jsonb->'profile'->>'profile_id') as alice_profile_id
\gset

select set_config('request.jwt.claims', '{"sub":"user_searchbob001"}', true);
select public.vvip_upsert_my_social_profile(
  'Search Bob', null, 'Bob Brakes', 'Irbid', 'Brake Parts', 'Search proof target'
) as bob_profile
\gset
select (:'bob_profile'::jsonb->'profile'->>'profile_id') as bob_profile_id
\gset
select public.vvip_social_post_create('needle bob public', 'public') as bob_public_post
\gset
select public.vvip_social_post_create('needle bob friends', 'friends') as bob_friends_post
\gset
select public.vvip_social_post_create('needle bob private', 'only_me') as bob_private_post
\gset

select set_config('request.jwt.claims', '{"sub":"user_searchcharlie01"}', true);
select public.vvip_upsert_my_social_profile(
  'Search Charlie', null, null, 'Zarqa', 'Tyres', 'Search proof public author'
) as charlie_profile
\gset
select (:'charlie_profile'::jsonb->'profile'->>'profile_id') as charlie_profile_id
\gset
select public.vvip_social_post_create('needle charlie public', 'public') as charlie_public_post
\gset

reset role;
insert into public.vvip_social_relationships (
  requester_subject, addressee_subject, relationship_state
) values (
  'user_searchalice01', 'user_searchbob001', 'friends'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_searchalice01"}', true);
select public.vvip_social_search_discovery(' Search Bob ', 20) as people_search
\gset
select (
  :'people_search'::jsonb->>'query' = 'search bob'
  and jsonb_array_length(:'people_search'::jsonb->'profiles') = 1
  and :'people_search'::jsonb->'profiles'->0->>'profile_id' = :'bob_profile_id'
  and (
    select count(*) from jsonb_object_keys(:'people_search'::jsonb->'profiles'->0)
  ) = 7
  and not (:'people_search'::jsonb->'profiles'->0 ? 'subject')
  and position('user_searchalice01' in :'people_search') = 0
  and position('user_searchbob001' in :'people_search') = 0
) as people_search_ok
\gset
\if :people_search_ok
  \echo P0_SEARCH_PEOPLE=PASS
\else
  \echo P0_SEARCH_PEOPLE=FAIL
  select 1 / 0;
\endif

select public.vvip_social_search_discovery(' NeedLe ', 20) as alice_post_search
\gset
select (
  :'alice_post_search'::jsonb->>'query' = 'needle'
  and jsonb_array_length(:'alice_post_search'::jsonb->'posts') = 3
  and exists (
    select 1 from jsonb_array_elements(:'alice_post_search'::jsonb->'posts') item
    where item->>'body' = 'needle bob public'
  )
  and exists (
    select 1 from jsonb_array_elements(:'alice_post_search'::jsonb->'posts') item
    where item->>'body' = 'needle bob friends'
  )
  and not exists (
    select 1 from jsonb_array_elements(:'alice_post_search'::jsonb->'posts') item
    where item->>'body' = 'needle bob private'
  )
  and not exists (
    select 1 from jsonb_array_elements(:'alice_post_search'::jsonb->'posts') item
    where (
      select count(*) from jsonb_object_keys(item)
    ) <> 9 or item ? 'subject' or item ? 'author_subject'
  )
  and position('user_searchalice01' in :'alice_post_search') = 0
  and position('user_searchbob001' in :'alice_post_search') = 0
) as alice_post_visibility_ok
\gset

select set_config('request.jwt.claims', '{"sub":"user_searchcharlie01"}', true);
select public.vvip_social_search_discovery('needle', 20) as charlie_post_search
\gset
select (
  :alice_post_visibility_ok
  and jsonb_array_length(:'charlie_post_search'::jsonb->'posts') = 2
  and exists (
    select 1 from jsonb_array_elements(:'charlie_post_search'::jsonb->'posts') item
    where item->>'body' = 'needle bob public'
  )
  and not exists (
    select 1 from jsonb_array_elements(:'charlie_post_search'::jsonb->'posts') item
    where item->>'body' in ('needle bob friends', 'needle bob private')
  )
) as post_visibility_ok
\gset
\if :post_visibility_ok
  \echo P0_SEARCH_POST_VISIBILITY=PASS
\else
  \echo P0_SEARCH_POST_VISIBILITY=FAIL
  select 1 / 0;
\endif

select set_config('request.jwt.claims', '{"sub":"user_searchalice01"}', true);
select public.vvip_social_discover_profiles(20) as alice_discovery
\gset
select (
  jsonb_array_length(:'alice_discovery'::jsonb->'profiles') = 2
  and not exists (
    select 1 from jsonb_array_elements(:'alice_discovery'::jsonb->'profiles') item
    where item->>'profile_id' = :'alice_profile_id'
      or (
        select count(*) from jsonb_object_keys(item)
      ) <> 7
      or item ? 'subject'
  )
  and position('user_searchalice01' in :'alice_discovery') = 0
  and position('user_searchbob001' in :'alice_discovery') = 0
) as discovery_ok
\gset
\if :discovery_ok
  \echo P0_SEARCH_DISCOVERY=PASS
\else
  \echo P0_SEARCH_DISCOVERY=FAIL
  select 1 / 0;
\endif

select public.vvip_social_block_profile(:'bob_profile_id'::uuid);
select public.vvip_social_search_discovery('Search Bob', 20) as blocked_people
\gset
select public.vvip_social_search_discovery('needle', 20) as blocked_posts
\gset
select public.vvip_social_discover_profiles(20) as blocked_discovery
\gset
select (
  jsonb_array_length(:'blocked_people'::jsonb->'profiles') = 0
  and jsonb_array_length(:'blocked_posts'::jsonb->'posts') = 1
  and :'blocked_posts'::jsonb->'posts'->0->>'body' = 'needle charlie public'
  and not exists (
    select 1 from jsonb_array_elements(:'blocked_discovery'::jsonb->'profiles') item
    where item->>'profile_id' = :'bob_profile_id'
  )
) as block_privacy_ok
\gset
\if :block_privacy_ok
  \echo P0_SEARCH_BLOCK_PRIVACY=PASS
\else
  \echo P0_SEARCH_BLOCK_PRIVACY=FAIL
  select 1 / 0;
\endif

select public.vvip_social_unblock_profile(:'bob_profile_id'::uuid);
select set_config('request.jwt.claims', '{"sub":"user_searchbob001"}', true);
select public.vvip_deactivate_my_social_profile();
select set_config('request.jwt.claims', '{"sub":"user_searchalice01"}', true);
select public.vvip_social_search_discovery('Search Bob', 20) as inactive_people
\gset
select public.vvip_social_search_discovery('needle', 20) as inactive_posts
\gset
select (
  jsonb_array_length(:'inactive_people'::jsonb->'profiles') = 0
  and jsonb_array_length(:'inactive_posts'::jsonb->'posts') = 2
  and exists (
    select 1 from jsonb_array_elements(:'inactive_posts'::jsonb->'posts') item
    where item->>'body' = 'needle bob public'
      and (item->>'author_available')::boolean = false
      and item->'author_profile_id' = 'null'::jsonb
      and item->>'author_display_name' = 'عضو غير متاح'
  )
  and position('user_searchbob001' in :'inactive_posts') = 0
) as lifecycle_privacy_ok
\gset
\if :lifecycle_privacy_ok
  \echo P0_SEARCH_LIFECYCLE_PRIVACY=PASS
\else
  \echo P0_SEARCH_LIFECYCLE_PRIVACY=FAIL
  select 1 / 0;
\endif

select set_config('vvip.test.search_bob_profile_id', :'bob_profile_id', true);
do $proof$
begin
  begin
    perform public.vvip_social_search_discovery('a', 20);
    raise exception 'P0_SEARCH_SHORT_QUERY_ALLOWED';
  exception when others then
    if sqlerrm <> 'SOCIAL_SEARCH_QUERY_INVALID' then raise; end if;
  end;

  begin
    perform public.vvip_social_search_discovery(repeat('x', 101), 20);
    raise exception 'P0_SEARCH_LONG_QUERY_ALLOWED';
  exception when others then
    if sqlerrm <> 'SOCIAL_SEARCH_QUERY_INVALID' then raise; end if;
  end;

  begin
    perform public.vvip_social_search_discovery('needle', 0);
    raise exception 'P0_SEARCH_ZERO_LIMIT_ALLOWED';
  exception when others then
    if sqlerrm <> 'SOCIAL_SEARCH_LIMIT_INVALID' then raise; end if;
  end;

  begin
    perform public.vvip_social_discover_profiles(26);
    raise exception 'P0_SEARCH_WIDE_LIMIT_ALLOWED';
  exception when others then
    if sqlerrm <> 'SOCIAL_SEARCH_LIMIT_INVALID' then raise; end if;
  end;
end;
$proof$;

select set_config('request.jwt.claims', '{"sub":"user_searchbob001"}', true);
do $proof$
begin
  begin
    perform public.vvip_social_search_discovery('needle', 20);
    raise exception 'P0_SEARCH_INACTIVE_ACTOR_ALLOWED';
  exception when others then
    if sqlerrm <> 'SOCIAL_PROFILE_INACTIVE' then raise; end if;
  end;
end;
$proof$;
\echo P0_SEARCH_DENIALS=PASS

\echo TIGER_P0_SEARCH_DISCOVERY_DB_BEHAVIOR=PASS

rollback;
