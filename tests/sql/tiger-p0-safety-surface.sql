\set ON_ERROR_STOP on

begin;

reset role;
select (
  has_function_privilege('authenticated', 'public.vvip_social_block_state(uuid)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.vvip_social_list_my_blocks(integer)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.vvip_social_block_profile(uuid)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.vvip_social_unblock_profile(uuid)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.vvip_social_submit_report(text,uuid,text,text)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.vvip_social_block_state(uuid)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.vvip_social_list_my_blocks(integer)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.vvip_social_block_profile(uuid)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.vvip_social_unblock_profile(uuid)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.vvip_social_submit_report(text,uuid,text,text)', 'EXECUTE')
  and not has_table_privilege('authenticated', 'public.vvip_social_reports', 'SELECT')
  and not has_table_privilege('authenticated', 'public.vvip_social_reports', 'INSERT')
  and not has_table_privilege('authenticated', 'public.vvip_social_reports', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.vvip_social_reports', 'DELETE')
) as safety_rpc_boundary
\gset
\if :safety_rpc_boundary
  \echo P0_SAFETY_RPC_BOUNDARY=PASS
\else
  \echo P0_SAFETY_RPC_BOUNDARY=FAIL
  select 1 / 0;
\endif

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_safetyalice01"}', true);
select public.vvip_upsert_my_social_profile(
  'Safety Alice', null, null, 'Amman', null, 'Safety proof actor'
) as alice_profile
\gset
select (:'alice_profile'::jsonb->'profile'->>'profile_id') as alice_profile_id
\gset

select set_config('request.jwt.claims', '{"sub":"user_safetybob001"}', true);
select public.vvip_upsert_my_social_profile(
  'Safety Bob', null, 'Bob Motors', 'Irbid', 'Parts', 'Safety proof target'
) as bob_profile
\gset
select (:'bob_profile'::jsonb->'profile'->>'profile_id') as bob_profile_id
\gset
select public.vvip_social_post_create('Safety reportable public post', 'public') as bob_public_post
\gset
select (:'bob_public_post'::jsonb->>'post_id') as bob_public_post_id
\gset
select public.vvip_social_post_create('Safety private post', 'only_me') as bob_private_post
\gset
select (:'bob_private_post'::jsonb->>'post_id') as bob_private_post_id
\gset

select set_config('request.jwt.claims', '{"sub":"user_safetyalice01"}', true);
select public.vvip_social_block_state(:'bob_profile_id'::uuid) as block_state_before
\gset
select public.vvip_social_block_profile(:'bob_profile_id'::uuid) as block_result
\gset
select public.vvip_social_block_state(:'bob_profile_id'::uuid) as block_state_after
\gset
select public.vvip_social_list_my_blocks(10) as block_list
\gset
select public.vvip_social_get_profile_surface(:'bob_profile_id'::uuid) as blocked_profile_surface
\gset
select (
  not (:'block_state_before'::jsonb->>'blocked_by_viewer')::boolean
  and (:'block_result'::jsonb->>'blocked')::boolean
  and (:'block_state_after'::jsonb->>'blocked_by_viewer')::boolean
  and jsonb_array_length(:'block_list'::jsonb->'items') = 1
  and :'block_list'::jsonb->'items'->0->>'profile_id' = :'bob_profile_id'
  and position('user_safetybob001' in :'block_list') = 0
  and :'blocked_profile_surface'::jsonb->>'status' = 'profile_unavailable'
) as block_state_ok
\gset
\if :block_state_ok
  \echo P0_SAFETY_BLOCK_STATE=PASS
\else
  \echo P0_SAFETY_BLOCK_STATE=FAIL
  select 1 / 0;
\endif

select public.vvip_social_unblock_profile(:'bob_profile_id'::uuid);
select public.vvip_social_submit_report(
  'profile', :'bob_profile_id'::uuid, 'harassment', 'Repeated unwanted contact'
) as profile_report
\gset
select (
  :'profile_report'::jsonb->>'status' = 'received'
  and not (:'profile_report'::jsonb->>'duplicate')::boolean
  and (:'profile_report'::jsonb->>'report_id')::uuid is not null
  and position('user_safetyalice01' in :'profile_report') = 0
  and position('user_safetybob001' in :'profile_report') = 0
) as profile_report_ok
\gset
\if :profile_report_ok
  \echo P0_SAFETY_PROFILE_REPORT=PASS
\else
  \echo P0_SAFETY_PROFILE_REPORT=FAIL
  select 1 / 0;
\endif

select public.vvip_social_submit_report(
  'post', :'bob_public_post_id'::uuid, 'spam', null
) as post_report
\gset
select (
  :'post_report'::jsonb->>'status' = 'received'
  and not (:'post_report'::jsonb->>'duplicate')::boolean
  and (:'post_report'::jsonb->>'report_id')::uuid is not null
  and position('user_safetybob001' in :'post_report') = 0
) as post_report_ok
\gset
\if :post_report_ok
  \echo P0_SAFETY_POST_REPORT=PASS
\else
  \echo P0_SAFETY_POST_REPORT=FAIL
  select 1 / 0;
\endif

select public.vvip_social_submit_report(
  'profile', :'bob_profile_id'::uuid, 'harassment', 'Different text cannot create another same-reason report'
) as profile_report_duplicate
\gset
select (
  (:'profile_report_duplicate'::jsonb->>'duplicate')::boolean
  and :'profile_report_duplicate'::jsonb->>'report_id' = :'profile_report'::jsonb->>'report_id'
) as report_dedupe_ok
\gset
\if :report_dedupe_ok
  \echo P0_SAFETY_REPORT_DEDUPE=PASS
\else
  \echo P0_SAFETY_REPORT_DEDUPE=FAIL
  select 1 / 0;
\endif

select set_config('vvip.test.safety_alice_profile_id', :'alice_profile_id', true);
select set_config('vvip.test.safety_private_post_id', :'bob_private_post_id', true);
do $proof$
begin
  begin
    perform public.vvip_social_submit_report(
      'profile',
      current_setting('vvip.test.safety_alice_profile_id')::uuid,
      'other',
      null
    );
    raise exception 'P0_SAFETY_SELF_REPORT_ALLOWED';
  exception when others then
    if sqlerrm <> 'SOCIAL_REPORT_SELF_DENIED' then
      raise;
    end if;
  end;

  begin
    perform public.vvip_social_submit_report(
      'post',
      current_setting('vvip.test.safety_private_post_id')::uuid,
      'spam',
      null
    );
    raise exception 'P0_SAFETY_PRIVATE_POST_REPORT_ALLOWED';
  exception when others then
    if sqlerrm <> 'SOCIAL_REPORT_TARGET_NOT_VISIBLE' then
      raise;
    end if;
  end;
end;
$proof$;
\echo P0_SAFETY_REPORT_DENIALS=PASS

select public.vvip_social_block_profile(:'bob_profile_id'::uuid);
select set_config('request.jwt.claims', '{"sub":"user_safetybob001"}', true);
select public.vvip_deactivate_my_social_profile();

select set_config('request.jwt.claims', '{"sub":"user_safetyalice01"}', true);
select public.vvip_social_block_state(:'bob_profile_id'::uuid) as inactive_state_before
\gset
select public.vvip_social_unblock_profile(:'bob_profile_id'::uuid) as inactive_unblock
\gset
select public.vvip_social_block_state(:'bob_profile_id'::uuid) as inactive_state_after
\gset
select (
  (:'inactive_state_before'::jsonb->>'blocked_by_viewer')::boolean
  and (:'inactive_unblock'::jsonb->>'changed')::boolean
  and not (:'inactive_state_after'::jsonb->>'blocked_by_viewer')::boolean
) as inactive_unblock_ok
\gset
\if :inactive_unblock_ok
  \echo P0_SAFETY_INACTIVE_UNBLOCK=PASS
\else
  \echo P0_SAFETY_INACTIVE_UNBLOCK=FAIL
  select 1 / 0;
\endif

reset role;
select (
  (select count(*) from public.vvip_social_reports where reporter_subject = 'user_safetyalice01') = 2
  and (select count(*) from public.vvip_social_reports where target_subject = 'user_safetybob001') = 2
) as report_storage_ok
\gset
\if :report_storage_ok
  \echo TIGER_P0_SAFETY_SURFACE_DB_BEHAVIOR=PASS
\else
  \echo TIGER_P0_SAFETY_SURFACE_DB_BEHAVIOR=FAIL
  select 1 / 0;
\endif

rollback;
