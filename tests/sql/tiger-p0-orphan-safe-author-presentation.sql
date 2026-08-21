\set ON_ERROR_STOP on

begin;

reset role;
select (
  not has_table_privilege('authenticated', 'public.vvip_social_posts', 'SELECT')
  and not has_table_privilege('authenticated', 'public.vvip_social_posts', 'INSERT')
  and not has_table_privilege('authenticated', 'public.vvip_social_posts', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.vvip_social_posts', 'DELETE')
  and has_function_privilege('authenticated', 'public.vvip_social_feed_page(integer,timestamp with time zone,uuid)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.vvip_social_post_create(text,text)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.vvip_social_comment_list(uuid)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.vvip_social_feed_page(integer,timestamp with time zone,uuid)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.vvip_social_post_create(text,text)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.vvip_social_comment_list(uuid)', 'EXECUTE')
) as orphan_safe_privilege_boundary
\gset
\if :orphan_safe_privilege_boundary
  \echo P0_ORPHAN_SAFE_PRIVILEGE_BOUNDARY=PASS
\else
  \echo P0_ORPHAN_SAFE_PRIVILEGE_BOUNDARY=FAIL
  \quit 1
\endif

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_orphan_author"}', true);
select public.vvip_upsert_my_social_profile(
  'Orphan Author',
  'https://example.invalid/orphan-author.png',
  'Tiger Archive',
  'Amman',
  'Automotive',
  'P0-B orphan-safe author proof'
) as orphan_author_profile
\gset
select (:'orphan_author_profile'::jsonb->'profile'->>'profile_id') as orphan_author_profile_id
\gset

select public.vvip_social_post_create('Historical P0-B post', 'public') as orphan_post
\gset
select (:'orphan_post'::jsonb->>'post_id') as orphan_post_id
\gset
select set_config('tiger.orphan_post_id', :'orphan_post_id', true);

select public.vvip_social_comment_create(
  :'orphan_post_id'::uuid,
  'Historical P0-B comment',
  null
) as orphan_comment
\gset
select (:'orphan_comment'::jsonb->'item'->>'comment_id') as orphan_comment_id
\gset

select set_config('request.jwt.claims', '{"sub":"user_orphan_viewer"}', true);
select public.vvip_upsert_my_social_profile(
  'Orphan Viewer',
  null,
  null,
  'Amman',
  null,
  'P0-B viewer proof'
) as orphan_viewer_profile
\gset

select (
  feed.author_available
  and feed.author_profile_id = :'orphan_author_profile_id'::uuid
  and feed.author_display_name = 'Orphan Author'
  and feed.author_avatar_url = 'https://example.invalid/orphan-author.png'
  and position('user_orphan_author' in row_to_json(feed)::text) = 0
) as orphan_active_feed_safe
from public.vvip_social_feed_page(20, null, null) as feed
where feed.post_id = :'orphan_post_id'::uuid
\gset
\if :orphan_active_feed_safe
  \echo P0_ORPHAN_SAFE_ACTIVE_FEED=PASS
\else
  \echo P0_ORPHAN_SAFE_ACTIVE_FEED=FAIL
  \quit 1
\endif

select public.vvip_social_comment_list(:'orphan_post_id'::uuid) as orphan_active_comments
\gset
select (
  jsonb_array_length(:'orphan_active_comments'::jsonb->'items') = 1
  and :'orphan_active_comments'::jsonb->'items'->0->>'author_profile_id' = :'orphan_author_profile_id'
  and :'orphan_active_comments'::jsonb->'items'->0->>'author_display_name' = 'Orphan Author'
  and (:'orphan_active_comments'::jsonb->'items'->0->>'author_available')::boolean
  and not (:'orphan_active_comments'::jsonb->'items'->0->>'viewer_can_edit')::boolean
  and position('user_orphan_author' in :'orphan_active_comments') = 0
) as orphan_active_comment_safe
\gset
\if :orphan_active_comment_safe
  \echo P0_ORPHAN_SAFE_ACTIVE_COMMENT=PASS
\else
  \echo P0_ORPHAN_SAFE_ACTIVE_COMMENT=FAIL
  \quit 1
\endif

select set_config('request.jwt.claims', '{"sub":"user_orphan_author"}', true);
select public.vvip_deactivate_my_social_profile() as orphan_deactivated
\gset
select (:'orphan_deactivated'::jsonb->'profile'->>'profile_state' = 'deactivated') as orphan_deactivated_ok
\gset
\if :orphan_deactivated_ok
  \echo P0_ORPHAN_SAFE_AUTHOR_DEACTIVATED=PASS
\else
  \echo P0_ORPHAN_SAFE_AUTHOR_DEACTIVATED=FAIL
  \quit 1
\endif

select set_config('request.jwt.claims', '{"sub":"user_orphan_viewer"}', true);
select (
  not feed.author_available
  and feed.author_profile_id is null
  and feed.author_display_name = 'عضو غير متاح'
  and feed.author_avatar_url is null
  and feed.body = 'Historical P0-B post'
  and position('user_orphan_author' in row_to_json(feed)::text) = 0
) as orphan_deactivated_feed_tombstone
from public.vvip_social_feed_page(20, null, null) as feed
where feed.post_id = :'orphan_post_id'::uuid
\gset
\if :orphan_deactivated_feed_tombstone
  \echo P0_ORPHAN_SAFE_DEACTIVATED_FEED_TOMBSTONE=PASS
\else
  \echo P0_ORPHAN_SAFE_DEACTIVATED_FEED_TOMBSTONE=FAIL
  \quit 1
\endif

select public.vvip_social_comment_list(:'orphan_post_id'::uuid) as orphan_deactivated_comments
\gset
select (
  jsonb_array_length(:'orphan_deactivated_comments'::jsonb->'items') = 1
  and :'orphan_deactivated_comments'::jsonb->'items'->0->>'author_profile_id' is null
  and :'orphan_deactivated_comments'::jsonb->'items'->0->>'author_display_name' = 'عضو غير متاح'
  and not (:'orphan_deactivated_comments'::jsonb->'items'->0->>'author_available')::boolean
  and position('user_orphan_author' in :'orphan_deactivated_comments') = 0
) as orphan_deactivated_comment_tombstone
\gset
\if :orphan_deactivated_comment_tombstone
  \echo P0_ORPHAN_SAFE_DEACTIVATED_COMMENT_TOMBSTONE=PASS
\else
  \echo P0_ORPHAN_SAFE_DEACTIVATED_COMMENT_TOMBSTONE=FAIL
  \quit 1
\endif

select set_config('request.jwt.claims', '{"sub":"user_orphan_author"}', true);
do $proof$
begin
  begin
    perform public.vvip_social_post_create('blocked post', 'public');
    raise exception 'TEST_EXPECTED_INACTIVE_POST_DENIAL';
  exception when others then
    if upper(sqlerrm) <> 'SOCIAL_PROFILE_INACTIVE' then raise; end if;
  end;

  begin
    perform public.vvip_social_comment_create(current_setting('tiger.orphan_post_id')::uuid, 'blocked comment', null);
    raise exception 'TEST_EXPECTED_INACTIVE_COMMENT_DENIAL';
  exception when others then
    if upper(sqlerrm) <> 'SOCIAL_PROFILE_INACTIVE' then raise; end if;
  end;

  begin
    perform public.vvip_social_set_reaction(current_setting('tiger.orphan_post_id')::uuid, 'like');
    raise exception 'TEST_EXPECTED_INACTIVE_REACTION_DENIAL';
  exception when others then
    if upper(sqlerrm) <> 'SOCIAL_PROFILE_INACTIVE' then raise; end if;
  end;

  begin
    perform public.vvip_social_save_post(current_setting('tiger.orphan_post_id')::uuid);
    raise exception 'TEST_EXPECTED_INACTIVE_BOOKMARK_DENIAL';
  exception when others then
    if upper(sqlerrm) <> 'SOCIAL_PROFILE_INACTIVE' then raise; end if;
  end;

  begin
    perform public.vvip_social_follow_user('user_orphan_viewer');
    raise exception 'TEST_EXPECTED_INACTIVE_FOLLOW_DENIAL';
  exception when others then
    if upper(sqlerrm) <> 'SOCIAL_PROFILE_INACTIVE' then raise; end if;
  end;

  begin
    insert into public.vvip_social_relationships (addressee_subject)
    values ('user_orphan_viewer');
    raise exception 'TEST_EXPECTED_INACTIVE_RELATIONSHIP_DENIAL';
  exception when others then
    if upper(sqlerrm) <> 'SOCIAL_PROFILE_INACTIVE' then raise; end if;
  end;
end;
$proof$;
\echo P0_ORPHAN_SAFE_INACTIVE_MUTATION_GUARD=PASS

select public.vvip_reactivate_my_social_profile() as orphan_reactivated
\gset
select (:'orphan_reactivated'::jsonb->'profile'->>'profile_state' = 'active') as orphan_reactivated_ok
\gset
\if :orphan_reactivated_ok
  \echo P0_ORPHAN_SAFE_AUTHOR_REACTIVATED=PASS
\else
  \echo P0_ORPHAN_SAFE_AUTHOR_REACTIVATED=FAIL
  \quit 1
\endif

select set_config('request.jwt.claims', '{"sub":"user_orphan_viewer"}', true);
select (
  feed.author_available
  and feed.author_profile_id = :'orphan_author_profile_id'::uuid
  and feed.author_display_name = 'Orphan Author'
) as orphan_reactivated_feed_safe
from public.vvip_social_feed_page(20, null, null) as feed
where feed.post_id = :'orphan_post_id'::uuid
\gset
\if :orphan_reactivated_feed_safe
  \echo P0_ORPHAN_SAFE_REACTIVATED_PRESENTATION=PASS
\else
  \echo P0_ORPHAN_SAFE_REACTIVATED_PRESENTATION=FAIL
  \quit 1
\endif

reset role;
set local role service_role;
select public.vvip_mark_social_profile_deleted('user_orphan_author') as orphan_deleted
\gset
select (:'orphan_deleted'::jsonb->'profile'->>'profile_state' = 'deleted') as orphan_deleted_ok
\gset
\if :orphan_deleted_ok
  \echo P0_ORPHAN_SAFE_AUTHOR_DELETED=PASS
\else
  \echo P0_ORPHAN_SAFE_AUTHOR_DELETED=FAIL
  \quit 1
\endif

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_orphan_viewer"}', true);
select (
  not feed.author_available
  and feed.author_profile_id is null
  and feed.author_display_name = 'عضو غير متاح'
  and feed.author_avatar_url is null
  and feed.body = 'Historical P0-B post'
  and position('user_orphan_author' in row_to_json(feed)::text) = 0
) as orphan_deleted_feed_tombstone
from public.vvip_social_feed_page(20, null, null) as feed
where feed.post_id = :'orphan_post_id'::uuid
\gset
\if :orphan_deleted_feed_tombstone
  \echo P0_ORPHAN_SAFE_DELETED_FEED_TOMBSTONE=PASS
\else
  \echo P0_ORPHAN_SAFE_DELETED_FEED_TOMBSTONE=FAIL
  \quit 1
\endif

select public.vvip_social_comment_list(:'orphan_post_id'::uuid) as orphan_deleted_comments
\gset
select (
  jsonb_array_length(:'orphan_deleted_comments'::jsonb->'items') = 1
  and :'orphan_deleted_comments'::jsonb->'items'->0->>'author_profile_id' is null
  and :'orphan_deleted_comments'::jsonb->'items'->0->>'author_display_name' = 'عضو غير متاح'
  and not (:'orphan_deleted_comments'::jsonb->'items'->0->>'author_available')::boolean
  and position('user_orphan_author' in :'orphan_deleted_comments') = 0
) as orphan_deleted_comment_tombstone
\gset
\if :orphan_deleted_comment_tombstone
  \echo P0_ORPHAN_SAFE_DELETED_COMMENT_TOMBSTONE=PASS
\else
  \echo P0_ORPHAN_SAFE_DELETED_COMMENT_TOMBSTONE=FAIL
  \quit 1
\endif

select set_config('request.jwt.claims', '{"sub":"user_orphan_author"}', true);
do $proof$
begin
  begin
    perform public.vvip_social_post_create('deleted actor blocked post', 'public');
    raise exception 'TEST_EXPECTED_DELETED_POST_DENIAL';
  exception when others then
    if upper(sqlerrm) <> 'SOCIAL_PROFILE_INACTIVE' then raise; end if;
  end;
end;
$proof$;
\echo P0_ORPHAN_SAFE_DELETED_MUTATION_GUARD=PASS

rollback;
\echo TIGER_P0_ORPHAN_SAFE_AUTHOR_PRESENTATION_DB_BEHAVIOR=PASS
