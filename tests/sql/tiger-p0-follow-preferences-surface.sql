\set ON_ERROR_STOP on

begin;

reset role;
select (
  has_function_privilege('authenticated', 'public.vvip_social_get_relationship_controls(uuid)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.vvip_social_follow_profile(uuid)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.vvip_social_unfollow_profile(uuid)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.vvip_social_list_feed_preferences()', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.vvip_social_set_feed_preference(uuid,text)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.vvip_social_follow_state(text)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.vvip_social_follow_user(text)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.vvip_social_unfollow_user(text)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.vvip_social_get_relationship_controls(uuid)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.vvip_social_follow_profile(uuid)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.vvip_social_unfollow_profile(uuid)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.vvip_social_list_feed_preferences()', 'EXECUTE')
  and not has_function_privilege('anon', 'public.vvip_social_set_feed_preference(uuid,text)', 'EXECUTE')
  and not has_table_privilege('authenticated', 'public.vvip_social_follows', 'SELECT')
  and not has_table_privilege('authenticated', 'public.vvip_social_feed_preferences', 'SELECT')
  and not has_table_privilege('authenticated', 'public.vvip_social_feed_preferences', 'INSERT')
  and not has_table_privilege('authenticated', 'public.vvip_social_feed_preferences', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.vvip_social_feed_preferences', 'DELETE')
) as follow_rpc_boundary
\gset
\if :follow_rpc_boundary
  \echo P0_FOLLOW_RPC_BOUNDARY=PASS
\else
  \echo P0_FOLLOW_RPC_BOUNDARY=FAIL
  select 1 / 0;
\endif

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_followalice01"}', true);
select public.vvip_upsert_my_social_profile(
  'Follow Alice', null, null, 'Amman', null, 'Follow proof actor'
) as alice_profile
\gset
select (:'alice_profile'::jsonb->'profile'->>'profile_id') as alice_profile_id
\gset

select set_config('request.jwt.claims', '{"sub":"user_followbob001"}', true);
select public.vvip_upsert_my_social_profile(
  'Follow Bob', null, 'Bob Motors', 'Irbid', 'Parts', 'Follow proof target'
) as bob_profile
\gset
select (:'bob_profile'::jsonb->'profile'->>'profile_id') as bob_profile_id
\gset

select set_config('request.jwt.claims', '{"sub":"user_followalice01"}', true);
select public.vvip_social_get_relationship_controls(:'bob_profile_id'::uuid) as controls_before
\gset
select public.vvip_social_follow_profile(:'bob_profile_id'::uuid) as controls_after_follow
\gset
select public.vvip_social_get_profile_surface(:'bob_profile_id'::uuid) as bob_surface_after_follow
\gset
select (
  not (:'controls_before'::jsonb->>'following')::boolean
  and (:'controls_after_follow'::jsonb->>'following')::boolean
  and :'controls_after_follow'::jsonb->>'profile_id' = :'bob_profile_id'
  and (:'bob_surface_after_follow'::jsonb->'profile'->>'followers_count')::bigint = 1
  and position('user_followalice01' in :'controls_after_follow') = 0
  and position('user_followbob001' in :'controls_after_follow') = 0
) as profile_uuid_follow_ok
\gset
\if :profile_uuid_follow_ok
  \echo P0_FOLLOW_PROFILE_UUID=PASS
\else
  \echo P0_FOLLOW_PROFILE_UUID=FAIL
  select 1 / 0;
\endif

select public.vvip_social_set_feed_preference(:'bob_profile_id'::uuid, 'mute');
select public.vvip_social_set_feed_preference(:'bob_profile_id'::uuid, 'snooze_24h');
select public.vvip_social_set_feed_preference(:'bob_profile_id'::uuid, 'prefer') as preferred_controls
\gset
select public.vvip_social_list_feed_preferences() as private_preferences
\gset
select (
  jsonb_array_length(:'private_preferences'::jsonb->'items') = 1
  and :'private_preferences'::jsonb->'items'->0->>'profile_id' = :'bob_profile_id'
  and (:'private_preferences'::jsonb->'items'->0->>'muted')::boolean
  and (:'private_preferences'::jsonb->'items'->0->>'snoozed_until')::timestamptz > statement_timestamp()
  and :'private_preferences'::jsonb->'items'->0->>'rank_mode' = 'prefer'
  and position('user_followalice01' in :'private_preferences') = 0
  and position('user_followbob001' in :'private_preferences') = 0
  and not (:'private_preferences'::jsonb->'items'->0 ? 'subject')
) as private_preferences_ok
\gset
\if :private_preferences_ok
  \echo P0_FOLLOW_PRIVATE_PREFERENCES=PASS
\else
  \echo P0_FOLLOW_PRIVATE_PREFERENCES=FAIL
  select 1 / 0;
\endif

select public.vvip_social_set_feed_preference(:'bob_profile_id'::uuid, 'unmute');
select public.vvip_social_set_feed_preference(:'bob_profile_id'::uuid, 'unsnooze');
select public.vvip_social_set_feed_preference(:'bob_profile_id'::uuid, 'deprioritize') as deprioritized_controls
\gset
select public.vvip_social_set_feed_preference(:'bob_profile_id'::uuid, 'normal') as normal_controls
\gset
select public.vvip_social_list_feed_preferences() as empty_preferences
\gset
select (
  :'deprioritized_controls'::jsonb->>'rank_mode' = 'deprioritize'
  and not (:'normal_controls'::jsonb->>'muted')::boolean
  and :'normal_controls'::jsonb->>'snoozed_until' is null
  and :'normal_controls'::jsonb->>'rank_mode' = 'normal'
  and jsonb_array_length(:'empty_preferences'::jsonb->'items') = 0
) as preference_actions_ok
\gset
\if :preference_actions_ok
  \echo P0_FOLLOW_PREFERENCE_ACTIONS=PASS
\else
  \echo P0_FOLLOW_PREFERENCE_ACTIONS=FAIL
  select 1 / 0;
\endif

select public.vvip_social_set_feed_preference(:'bob_profile_id'::uuid, 'mute');
select set_config('request.jwt.claims', '{"sub":"user_followbob001"}', true);
select public.vvip_social_follow_profile(:'alice_profile_id'::uuid);
select public.vvip_social_set_feed_preference(:'alice_profile_id'::uuid, 'prefer');

select set_config('request.jwt.claims', '{"sub":"user_followalice01"}', true);
select public.vvip_social_block_profile(:'bob_profile_id'::uuid);
reset role;
select (
  not exists (
    select 1 from public.vvip_social_follows
    where follower_subject in ('user_followalice01', 'user_followbob001')
      and followee_subject in ('user_followalice01', 'user_followbob001')
  )
  and not exists (
    select 1 from public.vvip_social_feed_preferences
    where actor_subject in ('user_followalice01', 'user_followbob001')
      and target_subject in ('user_followalice01', 'user_followbob001')
  )
) as block_cleanup_ok
\gset
\if :block_cleanup_ok
  \echo P0_FOLLOW_BLOCK_CLEANUP=PASS
\else
  \echo P0_FOLLOW_BLOCK_CLEANUP=FAIL
  select 1 / 0;
\endif

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_followalice01"}', true);
select public.vvip_social_unblock_profile(:'bob_profile_id'::uuid);
select public.vvip_social_follow_profile(:'bob_profile_id'::uuid);
select set_config('request.jwt.claims', '{"sub":"user_followbob001"}', true);
select public.vvip_deactivate_my_social_profile();
select set_config('request.jwt.claims', '{"sub":"user_followalice01"}', true);
select public.vvip_social_unfollow_profile(:'bob_profile_id'::uuid) as lifecycle_unfollow
\gset
select (
  not (:'lifecycle_unfollow'::jsonb->>'following')::boolean
  and (:'lifecycle_unfollow'::jsonb->>'changed')::boolean
) as lifecycle_unfollow_ok
\gset
\if :lifecycle_unfollow_ok
  \echo P0_FOLLOW_LIFECYCLE_UNFOLLOW=PASS
\else
  \echo P0_FOLLOW_LIFECYCLE_UNFOLLOW=FAIL
  select 1 / 0;
\endif

select set_config('request.jwt.claims', '{"sub":"user_followbob001"}', true);
select public.vvip_reactivate_my_social_profile();
select set_config('request.jwt.claims', '{"sub":"user_followalice01"}', true);
select public.vvip_social_block_profile(:'bob_profile_id'::uuid);
select set_config('vvip.test.follow_alice_profile_id', :'alice_profile_id', true);
select set_config('vvip.test.follow_bob_profile_id', :'bob_profile_id', true);
do $proof$
begin
  begin
    perform public.vvip_social_follow_profile(
      current_setting('vvip.test.follow_alice_profile_id')::uuid
    );
    raise exception 'P0_FOLLOW_SELF_ALLOWED';
  exception when others then
    if sqlerrm <> 'SOCIAL_SELF_FOLLOW_DENIED' then
      raise;
    end if;
  end;

  begin
    perform public.vvip_social_follow_profile(
      current_setting('vvip.test.follow_bob_profile_id')::uuid
    );
    raise exception 'P0_FOLLOW_BLOCKED_TARGET_ALLOWED';
  exception when others then
    if sqlerrm <> 'SOCIAL_RELATIONSHIP_TARGET_NOT_AVAILABLE' then
      raise;
    end if;
  end;

  begin
    perform public.vvip_social_set_feed_preference(
      current_setting('vvip.test.follow_bob_profile_id')::uuid,
      'mute'
    );
    raise exception 'P0_FOLLOW_BLOCKED_PREFERENCE_ALLOWED';
  exception when others then
    if sqlerrm <> 'SOCIAL_RELATIONSHIP_TARGET_NOT_AVAILABLE' then
      raise;
    end if;
  end;
end;
$proof$;
\echo P0_FOLLOW_DENIALS=PASS

\echo TIGER_P0_FOLLOW_PREFERENCES_DB_BEHAVIOR=PASS

rollback;
