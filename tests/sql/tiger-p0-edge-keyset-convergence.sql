\set ON_ERROR_STOP on

begin;

reset role;
select (
  has_function_privilege('authenticated', 'public.vvip_social_feed_read_keyset(text,integer)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.vvip_social_feed_read_keyset(text,integer)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.vvip_gate5_cursor_encode(jsonb)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.vvip_gate5_cursor_decode(text)', 'EXECUTE')
  and not has_table_privilege('authenticated', 'public.vvip_social_posts', 'SELECT')
) as edge_rpc_boundary
\gset
\if :edge_rpc_boundary
  \echo P0_EDGE_KEYSET_RPC_BOUNDARY=PASS
\else
  \echo P0_EDGE_KEYSET_RPC_BOUNDARY=FAIL
  \quit 1
\endif

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_edgeauthor01"}', true);
select public.vvip_upsert_my_social_profile(
  'Edge Author',
  'https://example.invalid/edge-author.png',
  'Tiger Edge',
  'Amman',
  'Automotive',
  'P0-D author proof'
) as edge_author_profile
\gset
select (:'edge_author_profile'::jsonb->'profile'->>'profile_id') as edge_author_profile_id
\gset

select public.vvip_social_post_create('Edge page oldest', 'public') as edge_post_oldest
\gset
select public.vvip_social_post_create('Edge page middle', 'public') as edge_post_middle
\gset
select public.vvip_social_post_create('Edge page newest', 'public') as edge_post_newest
\gset

select set_config('request.jwt.claims', '{"sub":"user_edgeviewer01"}', true);
select public.vvip_upsert_my_social_profile(
  'Edge Viewer',
  null,
  null,
  'Amman',
  null,
  'P0-D viewer proof'
) as edge_viewer_profile
\gset
select (:'edge_viewer_profile'::jsonb->'profile'->>'profile_id') as edge_viewer_profile_id
\gset

select public.vvip_social_feed_read_keyset(null, 2) as edge_first_page
\gset
select (
  :'edge_first_page'::jsonb->>'ok' = 'true'
  and jsonb_array_length(:'edge_first_page'::jsonb->'items') = 2
  and :'edge_first_page'::jsonb->>'next_cursor' is not null
  and :'edge_first_page'::jsonb->'items'->0->>'author_profile_id' = :'edge_author_profile_id'
  and :'edge_first_page'::jsonb->'items'->0->>'author_display_name' = 'Edge Author'
  and (:'edge_first_page'::jsonb->'items'->0->>'author_available')::boolean
  and position('user_edgeauthor01' in :'edge_first_page') = 0
  and position('user_edgeviewer01' in :'edge_first_page') = 0
) as edge_safe_first_page
\gset
\if :edge_safe_first_page
  \echo P0_EDGE_KEYSET_SAFE_FIRST_PAGE=PASS
\else
  \echo P0_EDGE_KEYSET_SAFE_FIRST_PAGE=FAIL
  \quit 1
\endif

select (:'edge_first_page'::jsonb->>'next_cursor') as edge_cursor
\gset
select set_config('tiger.edge_cursor', :'edge_cursor', true);

reset role;
select (
  public.vvip_gate5_cursor_decode(:'edge_cursor')->>'v' = '2'
  and public.vvip_gate5_cursor_decode(:'edge_cursor')->>'kind' = 'social_feed'
  and public.vvip_gate5_cursor_decode(:'edge_cursor')->>'actor_profile_id' = :'edge_viewer_profile_id'
  and position('user_edgeauthor01' in public.vvip_gate5_cursor_decode(:'edge_cursor')::text) = 0
  and position('user_edgeviewer01' in public.vvip_gate5_cursor_decode(:'edge_cursor')::text) = 0
) as edge_cursor_subject_blind
\gset
\if :edge_cursor_subject_blind
  \echo P0_EDGE_KEYSET_SUBJECT_BLIND=PASS
\else
  \echo P0_EDGE_KEYSET_SUBJECT_BLIND=FAIL
  \quit 1
\endif

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_edgeviewer01"}', true);
select public.vvip_social_feed_read_keyset(:'edge_cursor', 2) as edge_second_page
\gset
select (
  jsonb_array_length(:'edge_second_page'::jsonb->'items') = 1
  and :'edge_second_page'::jsonb->>'next_cursor' is null
) as edge_same_actor_next_page
\gset
\if :edge_same_actor_next_page
  \echo P0_EDGE_KEYSET_SAME_ACTOR_NEXT_PAGE=PASS
\else
  \echo P0_EDGE_KEYSET_SAME_ACTOR_NEXT_PAGE=FAIL
  \quit 1
\endif

select (
  not exists (
    select 1
    from jsonb_array_elements(:'edge_first_page'::jsonb->'items') first_item
    join jsonb_array_elements(:'edge_second_page'::jsonb->'items') second_item
      on first_item->>'post_id' = second_item->>'post_id'
  )
) as edge_no_duplicates
\gset
\if :edge_no_duplicates
  \echo P0_EDGE_KEYSET_NO_DUPLICATES=PASS
\else
  \echo P0_EDGE_KEYSET_NO_DUPLICATES=FAIL
  \quit 1
\endif

select set_config('request.jwt.claims', '{"sub":"user_edgeother001"}', true);
select public.vvip_upsert_my_social_profile(
  'Edge Other',
  null,
  null,
  'Amman',
  null,
  'P0-D cross-profile proof'
) as edge_other_profile
\gset

do $proof$
begin
  begin
    perform public.vvip_social_feed_read_keyset(current_setting('tiger.edge_cursor'), 2);
    raise exception 'TEST_EXPECTED_EDGE_CONTEXT_DENIAL';
  exception when others then
    if upper(sqlerrm) <> 'GATE5_CURSOR_CONTEXT_MISMATCH' then raise; end if;
  end;
end;
$proof$;
\echo P0_EDGE_KEYSET_CROSS_PROFILE_CURSOR_DENIED=PASS

select set_config('request.jwt.claims', '{"sub":"user_edgeviewer01"}', true);
select public.vvip_social_block_profile(:'edge_author_profile_id'::uuid) as edge_block_result
\gset
select public.vvip_social_feed_read_keyset(null, 10) as edge_blocked_page
\gset
select (
  not exists (
    select 1
    from jsonb_array_elements(:'edge_blocked_page'::jsonb->'items') item
    where item->>'author_profile_id' = :'edge_author_profile_id'
  )
) as edge_block_reevaluated
\gset
\if :edge_block_reevaluated
  \echo P0_EDGE_KEYSET_BLOCK_REEVALUATED=PASS
\else
  \echo P0_EDGE_KEYSET_BLOCK_REEVALUATED=FAIL
  \quit 1
\endif

select public.vvip_social_unblock_profile(:'edge_author_profile_id'::uuid) as edge_unblock_result
\gset

select set_config('request.jwt.claims', '{"sub":"user_edgeauthor01"}', true);
select public.vvip_deactivate_my_social_profile() as edge_author_deactivated
\gset

select set_config('request.jwt.claims', '{"sub":"user_edgeviewer01"}', true);
select public.vvip_social_feed_read_keyset(null, 10) as edge_orphan_page
\gset
select (
  jsonb_array_length(:'edge_orphan_page'::jsonb->'items') = 3
  and not exists (
    select 1
    from jsonb_array_elements(:'edge_orphan_page'::jsonb->'items') item
    where (item->>'author_available')::boolean
       or item->>'author_profile_id' is not null
       or item->>'author_display_name' <> 'عضو غير متاح'
       or item->>'author_avatar_url' is not null
  )
  and position('user_edgeauthor01' in :'edge_orphan_page') = 0
) as edge_orphan_tombstone
\gset
\if :edge_orphan_tombstone
  \echo P0_EDGE_KEYSET_ORPHAN_TOMBSTONE=PASS
\else
  \echo P0_EDGE_KEYSET_ORPHAN_TOMBSTONE=FAIL
  \quit 1
\endif

select public.vvip_deactivate_my_social_profile() as edge_viewer_deactivated
\gset

do $proof$
begin
  begin
    perform public.vvip_social_feed_read_keyset(null, 10);
    raise exception 'TEST_EXPECTED_EDGE_INACTIVE_ACTOR_DENIAL';
  exception when others then
    if upper(sqlerrm) <> 'SOCIAL_PROFILE_INACTIVE' then raise; end if;
  end;
end;
$proof$;
\echo P0_EDGE_KEYSET_INACTIVE_ACTOR_DENIED=PASS

rollback;
\echo TIGER_P0_EDGE_KEYSET_DB_BEHAVIOR=PASS
