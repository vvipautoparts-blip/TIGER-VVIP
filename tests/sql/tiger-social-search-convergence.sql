\set ON_ERROR_STOP on

begin;

reset role;
select (
  has_function_privilege('authenticated', 'public.vvip_social_search_people(text,text,integer)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.vvip_social_search_posts(text,text,integer)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.vvip_social_search_people(text,text,integer)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.vvip_social_search_posts(text,text,integer)', 'EXECUTE')
  and not has_table_privilege('authenticated', 'public.vvip_social_search_budget', 'SELECT')
  and not has_table_privilege('authenticated', 'public.vvip_social_search_budget', 'INSERT')
  and not has_table_privilege('authenticated', 'public.vvip_social_search_budget', 'UPDATE')
) as search_rpc_boundary
\gset
\if :search_rpc_boundary
  \echo P0_C_SEARCH_RPC_BOUNDARY=PASS
\else
  \echo P0_C_SEARCH_RPC_BOUNDARY=FAIL
  \quit 1
\endif

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_searchalpha01"}', true);
select public.vvip_upsert_my_social_profile('Tiger Alpha', null, 'Alpha Co', 'Amman', 'Cars', 'Public profile') as alpha_profile
\gset
select (:'alpha_profile'::jsonb->'profile'->>'profile_id') as alpha_profile_id
\gset

select set_config('request.jwt.claims', '{"sub":"user_searchbeta001"}', true);
select public.vvip_upsert_my_social_profile('Tiger Beta', null, 'Beta Co', 'Zarqa', 'Property', 'Public profile') as beta_profile
\gset
select (:'beta_profile'::jsonb->'profile'->>'profile_id') as beta_profile_id
\gset

select set_config('request.jwt.claims', '{"sub":"user_searchgamma01"}', true);
select public.vvip_upsert_my_social_profile('Tiger Gamma', null, 'Gamma Co', 'Irbid', 'Services', 'Public profile') as gamma_profile
\gset
select (:'gamma_profile'::jsonb->'profile'->>'profile_id') as gamma_profile_id
\gset

select set_config('request.jwt.claims', '{"sub":"user_searchhidden01"}', true);
select public.vvip_upsert_my_social_profile('Tiger Hidden', null, null, 'Amman', null, 'Must be absent') as hidden_profile
\gset
select (:'hidden_profile'::jsonb->'profile'->>'profile_id') as hidden_profile_id
\gset
select public.vvip_deactivate_my_social_profile() as hidden_deactivated
\gset

select set_config('request.jwt.claims', '{"sub":"user_searchviewer01"}', true);
select public.vvip_upsert_my_social_profile('Search Viewer', null, null, 'Amman', null, 'P0-C viewer') as viewer_profile
\gset
select (:'viewer_profile'::jsonb->'profile'->>'profile_id') as viewer_profile_id
\gset
select public.vvip_social_block_profile(:'beta_profile_id'::uuid) as block_beta
\gset

select public.vvip_social_search_people('  TÏGER  ', null, 1) as people_page_one
\gset
select (
  :'people_page_one'::jsonb->>'ok' = 'true'
  and jsonb_array_length(:'people_page_one'::jsonb->'items') = 1
  and :'people_page_one'::jsonb->>'next_cursor' is not null
  and position('user_search' in :'people_page_one') = 0
  and not exists (
    select 1 from jsonb_array_elements(:'people_page_one'::jsonb->'items') item
    where item->>'profile_id' in (:'beta_profile_id', :'hidden_profile_id', :'viewer_profile_id')
  )
) as people_safe_page
\gset
\if :people_safe_page
  \echo P0_C_PEOPLE_SAFE_PAGE=PASS
\else
  \echo P0_C_PEOPLE_SAFE_PAGE=FAIL
  \quit 1
\endif

select (:'people_page_one'::jsonb->>'next_cursor') as people_cursor
\gset
select public.vvip_social_search_people('tïger', :'people_cursor', 2) as people_page_two
\gset
select (
  not exists (
    select 1
    from jsonb_array_elements(:'people_page_one'::jsonb->'items') first_item
    join jsonb_array_elements(:'people_page_two'::jsonb->'items') second_item
      on first_item->>'profile_id' = second_item->>'profile_id'
  )
) as people_no_duplicates
\gset
\if :people_no_duplicates
  \echo P0_C_PEOPLE_NO_DUPLICATES=PASS
\else
  \echo P0_C_PEOPLE_NO_DUPLICATES=FAIL
  \quit 1
\endif

select set_config('tiger.search_people_cursor', :'people_cursor', true);
do $proof$
begin
  begin
    perform public.vvip_social_search_people('different', current_setting('tiger.search_people_cursor'), 2);
    raise exception 'TEST_EXPECTED_QUERY_CURSOR_DENIAL';
  exception when others then
    if upper(sqlerrm) <> 'GATE5_CURSOR_CONTEXT_MISMATCH' then raise; end if;
  end;
end;
$proof$;
\echo P0_C_QUERY_CURSOR_MISMATCH_DENIED=PASS

select set_config('request.jwt.claims', '{"sub":"user_searchother001"}', true);
select public.vvip_upsert_my_social_profile('Search Other', null, null, 'Amman', null, 'Cross actor') as other_profile
\gset
do $proof$
begin
  begin
    perform public.vvip_social_search_people('tïger', current_setting('tiger.search_people_cursor'), 2);
    raise exception 'TEST_EXPECTED_ACTOR_CURSOR_DENIAL';
  exception when others then
    if upper(sqlerrm) <> 'GATE5_CURSOR_CONTEXT_MISMATCH' then raise; end if;
  end;
end;
$proof$;
\echo P0_C_ACTOR_CURSOR_MISMATCH_DENIED=PASS

select set_config('request.jwt.claims', '{"sub":"user_searchalpha01"}', true);
select public.vvip_social_post_create('Phoenix public signal', 'public') as phoenix_public
\gset
select public.vvip_social_post_create('Phoenix friends signal', 'friends') as phoenix_friends
\gset
select public.vvip_social_post_create('Phoenix private signal', 'only_me') as phoenix_private
\gset
insert into public.vvip_social_relationships(addressee_subject) values ('user_searchviewer01') returning relationship_id as phoenix_relationship_id
\gset

select set_config('request.jwt.claims', '{"sub":"user_searchviewer01"}', true);
update public.vvip_social_relationships set relationship_state = 'friends' where relationship_id = :'phoenix_relationship_id'::uuid;
select public.vvip_social_unblock_profile(:'beta_profile_id'::uuid) as unblock_beta
\gset

select public.vvip_social_search_posts('phoenix', null, 10) as posts_visible
\gset
select (
  jsonb_array_length(:'posts_visible'::jsonb->'items') = 2
  and not exists (
    select 1 from jsonb_array_elements(:'posts_visible'::jsonb->'items') item
    where item->>'audience' = 'only_me'
       or item->>'author_profile_id' <> :'alpha_profile_id'
  )
  and position('user_searchalpha01' in :'posts_visible') = 0
) as posts_privacy_subset
\gset
\if :posts_privacy_subset
  \echo P0_C_POST_PRIVACY_SUBSET=PASS
\else
  \echo P0_C_POST_PRIVACY_SUBSET=FAIL
  \quit 1
\endif

select public.vvip_social_block_profile(:'alpha_profile_id'::uuid) as block_alpha
\gset
select public.vvip_social_search_posts('phoenix', null, 10) as posts_blocked
\gset
select jsonb_array_length(:'posts_blocked'::jsonb->'items') = 0 as posts_block_excluded
\gset
\if :posts_block_excluded
  \echo P0_C_POST_BLOCK_EXCLUDED=PASS
\else
  \echo P0_C_POST_BLOCK_EXCLUDED=FAIL
  \quit 1
\endif
select public.vvip_social_unblock_profile(:'alpha_profile_id'::uuid) as unblock_alpha
\gset

select set_config('request.jwt.claims', '{"sub":"user_searchalpha01"}', true);
select public.vvip_deactivate_my_social_profile() as alpha_deactivated
\gset
select set_config('request.jwt.claims', '{"sub":"user_searchviewer01"}', true);
select public.vvip_social_search_posts('phoenix', null, 10) as posts_deactivated
\gset
select jsonb_array_length(:'posts_deactivated'::jsonb->'items') = 0 as posts_deactivated_excluded
\gset
\if :posts_deactivated_excluded
  \echo P0_C_POST_DEACTIVATED_EXCLUDED=PASS
\else
  \echo P0_C_POST_DEACTIVATED_EXCLUDED=FAIL
  \quit 1
\endif

reset role;
delete from public.vvip_social_search_budget where actor_profile_id = :'viewer_profile_id'::uuid;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_searchviewer01"}', true);
select public.vvip_social_search_people('tiger', null, 1) from generate_series(1, 30);
do $proof$
begin
  begin
    perform public.vvip_social_search_posts('phoenix', null, 1);
    raise exception 'TEST_EXPECTED_SEARCH_RATE_LIMIT';
  exception when others then
    if upper(sqlerrm) <> 'SOCIAL_SEARCH_RATE_LIMITED' then raise; end if;
  end;
end;
$proof$;
\echo P0_C_SHARED_RATE_BUDGET=PASS

rollback;
\echo TIGER_P0_C_SEARCH_DB_BEHAVIOR=PASS
