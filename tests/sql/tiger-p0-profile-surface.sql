\set ON_ERROR_STOP on

begin;

reset role;
select (
  has_function_privilege('authenticated', 'public.vvip_social_get_profile_surface(uuid)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.vvip_social_list_profile_posts(uuid,text,integer)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.vvip_social_get_profile_surface(uuid)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.vvip_social_list_profile_posts(uuid,text,integer)', 'EXECUTE')
  and not has_table_privilege('authenticated', 'public.vvip_social_profile_projection', 'SELECT')
  and not has_table_privilege('authenticated', 'public.vvip_social_posts', 'SELECT')
  and not has_table_privilege('authenticated', 'public.vvip_social_follows', 'SELECT')
) as profile_rpc_boundary
\gset
\if :profile_rpc_boundary
  \echo P0_PROFILE_RPC_BOUNDARY=PASS
\else
  \echo P0_PROFILE_RPC_BOUNDARY=FAIL
  select 1 / 0;
\endif

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_profilealice01"}', true);
select public.vvip_upsert_my_social_profile(
  'Profile Alice', null, 'Alice Motors', 'Amman', 'Automotive', 'Alice safe presentation'
) as alice_profile
\gset
select (:'alice_profile'::jsonb->'profile'->>'profile_id') as alice_profile_id
\gset

select set_config('request.jwt.claims', '{"sub":"user_profilebob001"}', true);
select public.vvip_upsert_my_social_profile(
  'Profile Bob', 'https://example.invalid/bob.png', 'Bob Motors', 'Irbid', 'Parts', 'Bob safe presentation'
) as bob_profile
\gset
select (:'bob_profile'::jsonb->'profile'->>'profile_id') as bob_profile_id
\gset
select public.vvip_social_post_create('Bob public profile post', 'public');
select public.vvip_social_post_create('Bob friends profile post', 'friends');
select public.vvip_social_post_create('Bob private profile post', 'only_me');

select set_config('request.jwt.claims', '{"sub":"user_profilecharlie01"}', true);
select public.vvip_upsert_my_social_profile(
  'Profile Charlie', null, null, 'Aqaba', null, 'Charlie safe presentation'
) as charlie_profile
\gset
select (:'charlie_profile'::jsonb->'profile'->>'profile_id') as charlie_profile_id
\gset

reset role;
insert into public.vvip_social_relationships (
  requester_subject, addressee_subject, relationship_state
) values (
  'user_profilealice01', 'user_profilebob001', 'friends'
);
insert into public.vvip_social_follows (follower_subject, followee_subject)
values
  ('user_profilealice01', 'user_profilebob001'),
  ('user_profilecharlie01', 'user_profilebob001'),
  ('user_profilebob001', 'user_profilecharlie01');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_profilealice01"}', true);
select public.vvip_social_get_profile_surface(:'bob_profile_id'::uuid) as alice_views_bob
\gset
select (
  :'alice_views_bob'::jsonb->>'status' = 'profile_loaded'
  and :'alice_views_bob'::jsonb->'profile'->>'profile_id' = :'bob_profile_id'
  and :'alice_views_bob'::jsonb->'profile'->>'display_name' = 'Profile Bob'
  and (:'alice_views_bob'::jsonb->'profile'->>'friends_count')::bigint = 1
  and (:'alice_views_bob'::jsonb->'profile'->>'followers_count')::bigint = 2
  and (:'alice_views_bob'::jsonb->'profile'->>'following_count')::bigint = 1
  and (:'alice_views_bob'::jsonb->'profile'->>'posts_count')::bigint = 2
  and not (:'alice_views_bob'::jsonb->'profile'->>'viewer_is_owner')::boolean
  and (:'alice_views_bob'::jsonb->'profile'->>'is_friend')::boolean
  and (:'alice_views_bob'::jsonb->'profile'->>'can_message')::boolean
  and position('user_profilebob001' in :'alice_views_bob') = 0
  and not (:'alice_views_bob'::jsonb->'profile' ? 'subject')
  and not (:'alice_views_bob'::jsonb->'profile' ? 'profile_state')
) as safe_public_surface
\gset
\if :safe_public_surface
  \echo P0_PROFILE_SAFE_PUBLIC_SURFACE=PASS
\else
  \echo P0_PROFILE_SAFE_PUBLIC_SURFACE=FAIL
  select 1 / 0;
\endif

select set_config('request.jwt.claims', '{"sub":"user_profilebob001"}', true);
select public.vvip_social_get_profile_surface(null) as bob_views_self
\gset
select (
  :'bob_views_self'::jsonb->>'status' = 'profile_loaded'
  and (:'bob_views_self'::jsonb->'profile'->>'viewer_is_owner')::boolean
  and not (:'bob_views_self'::jsonb->'profile'->>'is_friend')::boolean
  and not (:'bob_views_self'::jsonb->'profile'->>'can_message')::boolean
  and (:'bob_views_self'::jsonb->'profile'->>'posts_count')::bigint = 3
) as owner_surface
\gset
\if :owner_surface
  \echo P0_PROFILE_OWNER_SURFACE=PASS
\else
  \echo P0_PROFILE_OWNER_SURFACE=FAIL
  select 1 / 0;
\endif

select set_config('request.jwt.claims', '{"sub":"user_profilealice01"}', true);
select public.vvip_social_list_profile_posts(:'bob_profile_id'::uuid, null, 1) as bob_page_one
\gset
select (:'bob_page_one'::jsonb->>'next_cursor') as bob_cursor
\gset
select (:'bob_page_one'::jsonb->'items'->0->>'post_id') as bob_page_one_post_id
\gset
select set_config('vvip.test.profile_alice_id', :'alice_profile_id', true);
select set_config('vvip.test.profile_bob_id', :'bob_profile_id', true);
select set_config('vvip.test.profile_bob_cursor', :'bob_cursor', true);
select public.vvip_social_list_profile_posts(
  :'bob_profile_id'::uuid, :'bob_cursor', 1
) as bob_page_two
\gset
select (
  jsonb_array_length(:'bob_page_one'::jsonb->'items') = 1
  and jsonb_array_length(:'bob_page_two'::jsonb->'items') = 1
  and :'bob_page_one'::jsonb->>'next_cursor' is not null
  and :'bob_page_one_post_id' <> :'bob_page_two'::jsonb->'items'->0->>'post_id'
  and position('Bob private profile post' in :'bob_page_one') = 0
  and position('Bob private profile post' in :'bob_page_two') = 0
  and position('user_profilebob001' in :'bob_page_one') = 0
  and not (:'bob_page_one'::jsonb->'items'->0 ? 'author_subject')
) as timeline_visibility
\gset
\if :timeline_visibility
  \echo P0_PROFILE_TIMELINE_VISIBILITY=PASS
\else
  \echo P0_PROFILE_TIMELINE_VISIBILITY=FAIL
  select 1 / 0;
\endif

do $proof$
begin
  perform public.vvip_social_list_profile_posts(
    current_setting('vvip.test.profile_alice_id')::uuid,
    current_setting('vvip.test.profile_bob_cursor'),
    1
  );
  raise exception 'P0_PROFILE_TARGET_CURSOR_REUSE_ALLOWED';
exception when others then
  if sqlerrm <> 'GATE5_CURSOR_CONTEXT_MISMATCH' then
    raise;
  end if;
end;
$proof$;
select set_config('request.jwt.claims', '{"sub":"user_profilecharlie01"}', true);
do $proof$
begin
  perform public.vvip_social_list_profile_posts(
    current_setting('vvip.test.profile_bob_id')::uuid,
    current_setting('vvip.test.profile_bob_cursor'),
    1
  );
  raise exception 'P0_PROFILE_ACTOR_CURSOR_REUSE_ALLOWED';
exception when others then
  if sqlerrm <> 'GATE5_CURSOR_CONTEXT_MISMATCH' then
    raise;
  end if;
end;
$proof$;
\echo P0_PROFILE_CURSOR_BINDING=PASS

reset role;
select public.vvip_gate5_cursor_encode(jsonb_build_object(
  'v', 2,
  'kind', 'social_profile_timeline',
  'actor_profile_id', null,
  'target_profile_id', :'bob_profile_id'::uuid,
  'created_at', '9999-12-31T23:59:59Z',
  'id', 'ffffffff-ffff-4fff-bfff-ffffffffffff'
)) as null_actor_cursor
\gset
select public.vvip_gate5_cursor_encode(jsonb_build_object(
  'v', 2,
  'kind', 'social_profile_timeline',
  'actor_profile_id', :'alice_profile_id'::uuid,
  'target_profile_id', null,
  'created_at', '9999-12-31T23:59:59Z',
  'id', 'ffffffff-ffff-4fff-bfff-ffffffffffff'
)) as null_target_cursor
\gset

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_profilealice01"}', true);
select set_config('vvip.test.profile_null_actor_cursor', :'null_actor_cursor', true);
select set_config('vvip.test.profile_null_target_cursor', :'null_target_cursor', true);
do $proof$
declare
  v_cursor text;
begin
  foreach v_cursor in array array[
    current_setting('vvip.test.profile_null_actor_cursor'),
    current_setting('vvip.test.profile_null_target_cursor')
  ] loop
    begin
      perform public.vvip_social_list_profile_posts(
        current_setting('vvip.test.profile_bob_id')::uuid,
        v_cursor,
        1
      );
      raise exception 'P0_PROFILE_NULL_CURSOR_BINDING_ALLOWED';
    exception when others then
      if sqlerrm <> 'GATE5_CURSOR_INVALID' then
        raise;
      end if;
    end;
  end loop;
end;
$proof$;
\echo P0_PROFILE_NULL_CURSOR_BINDING=PASS

select set_config('request.jwt.claims', '{"sub":"user_profilealice01"}', true);
select public.vvip_social_block_profile(:'bob_profile_id'::uuid);
select public.vvip_social_get_profile_surface(:'bob_profile_id'::uuid) as blocked_surface
\gset
select public.vvip_social_list_profile_posts(:'bob_profile_id'::uuid, null, 20) as blocked_timeline
\gset
select public.vvip_social_list_profile_posts(
  :'bob_profile_id'::uuid, current_setting('vvip.test.profile_bob_cursor'), 20
) as blocked_continued_timeline
\gset
select (
  :'blocked_surface'::jsonb->>'status' = 'profile_unavailable'
  and :'blocked_surface'::jsonb->'profile' = 'null'::jsonb
  and jsonb_array_length(:'blocked_timeline'::jsonb->'items') = 0
  and jsonb_array_length(:'blocked_continued_timeline'::jsonb->'items') = 0
  and position('Bob public profile post' in :'blocked_continued_timeline') = 0
  and position('Bob friends profile post' in :'blocked_continued_timeline') = 0
  and public.vvip_get_public_profile(:'bob_profile_id'::uuid) is null
) as block_privacy
\gset
\if :block_privacy
  \echo P0_PROFILE_BLOCK_PRIVACY=PASS
\else
  \echo P0_PROFILE_BLOCK_PRIVACY=FAIL
  select 1 / 0;
\endif

select public.vvip_social_unblock_profile(:'bob_profile_id'::uuid);
select set_config('request.jwt.claims', '{"sub":"user_profilebob001"}', true);
select public.vvip_deactivate_my_social_profile();
select set_config('request.jwt.claims', '{"sub":"user_profilealice01"}', true);
select public.vvip_social_get_profile_surface(:'bob_profile_id'::uuid) as inactive_surface
\gset
select public.vvip_social_list_profile_posts(:'bob_profile_id'::uuid, null, 20) as inactive_timeline
\gset
select public.vvip_social_list_profile_posts(
  :'bob_profile_id'::uuid, current_setting('vvip.test.profile_bob_cursor'), 20
) as inactive_continued_timeline
\gset
select (
  :'inactive_surface'::jsonb->>'status' = 'profile_unavailable'
  and :'inactive_surface'::jsonb->'profile' = 'null'::jsonb
  and jsonb_array_length(:'inactive_timeline'::jsonb->'items') = 0
  and jsonb_array_length(:'inactive_continued_timeline'::jsonb->'items') = 0
  and position('Bob public profile post' in :'inactive_continued_timeline') = 0
  and position('Bob friends profile post' in :'inactive_continued_timeline') = 0
  and public.vvip_get_public_profile(:'bob_profile_id'::uuid) is null
) as lifecycle_privacy
\gset
\if :lifecycle_privacy
  \echo P0_PROFILE_LIFECYCLE_PRIVACY=PASS
\else
  \echo P0_PROFILE_LIFECYCLE_PRIVACY=FAIL
  select 1 / 0;
\endif

rollback;
\echo TIGER_P0_PROFILE_SURFACE_DB_BEHAVIOR=PASS
