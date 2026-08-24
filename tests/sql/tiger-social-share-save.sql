\set ON_ERROR_STOP on

begin;

reset role;
select (
  not has_table_privilege('authenticated', 'public.vvip_social_reposts', 'SELECT')
  and not has_table_privilege('authenticated', 'public.vvip_social_reposts', 'INSERT')
  and not has_table_privilege('authenticated', 'public.vvip_social_reposts', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.vvip_social_reposts', 'DELETE')
  and not has_table_privilege('authenticated', 'public.vvip_social_bookmarks', 'SELECT')
  and not has_table_privilege('authenticated', 'public.vvip_social_bookmarks', 'INSERT')
  and not has_table_privilege('authenticated', 'public.vvip_social_bookmarks', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.vvip_social_bookmarks', 'DELETE')
) as share_save_no_direct_browser_crud
\gset
\if :share_save_no_direct_browser_crud
  \echo SHARE_SAVE_NO_DIRECT_BROWSER_CRUD=PASS
\else
  \echo SHARE_SAVE_NO_DIRECT_BROWSER_CRUD=FAIL
  \quit 1
\endif

select (
  has_function_privilege('authenticated', 'public.vvip_social_repost_post(uuid,text)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.vvip_social_bookmark_state(uuid)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.vvip_social_save_post(uuid)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.vvip_social_unsave_post(uuid)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.vvip_social_can_view_post(uuid,text)', 'EXECUTE')
) as share_save_rpc_boundary
\gset
\if :share_save_rpc_boundary
  \echo SHARE_SAVE_RPC_BOUNDARY=PASS
\else
  \echo SHARE_SAVE_RPC_BOUNDARY=FAIL
  \quit 1
\endif

-- Alice owns the original friends-only post and becomes friends with Bob.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_alice01"}', true);
select public.vvip_upsert_my_social_profile('Alice Share Proof', null, null, 'Amman', null, 'Share/save rehearsal actor');
select (public.vvip_social_post_create('friends-original-v1', 'friends')->>'post_id')::uuid as original_post_id
\gset
insert into public.vvip_social_relationships (addressee_subject) values ('user_bob001');
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_bob001"}', true);
select public.vvip_upsert_my_social_profile('Bob Share Proof', null, null, 'Amman', null, 'Share/save rehearsal actor');
update public.vvip_social_relationships
set relationship_state = 'friends'
where requester_subject = 'user_alice01'
  and addressee_subject = 'user_bob001'
  and relationship_state = 'pending';

-- Bob and Charlie are friends, while Charlie is deliberately not Alice's friend.
insert into public.vvip_social_relationships (addressee_subject) values ('user_charlie01');

-- Private save is idempotent and remains actor-scoped.
select (public.vvip_social_save_post(:'original_post_id'::uuid)->>'saved' = 'true') as bob_save_visible_post
\gset
\if :bob_save_visible_post
  \echo BOB_SAVE_VISIBLE_POST=PASS
\else
  \echo BOB_SAVE_VISIBLE_POST=FAIL
  \quit 1
\endif

select (public.vvip_social_save_post(:'original_post_id'::uuid)->>'saved' = 'true') as bob_save_idempotent
\gset
\if :bob_save_idempotent
  \echo BOB_SAVE_IDEMPOTENT=PASS
\else
  \echo BOB_SAVE_IDEMPOTENT=FAIL
  \quit 1
\endif

-- Bob reposts at the same privacy ceiling.
select public.vvip_social_repost_post(:'original_post_id'::uuid, 'friends') as first_repost
\gset
select (:'first_repost'::jsonb->>'repost_post_id')::uuid as repost_post_id
\gset
select set_config('tiger.share_save.original_post_id', :'original_post_id', true);
select set_config('tiger.share_save.repost_post_id', :'repost_post_id', true);
select (:'first_repost'::jsonb->>'created' = 'true') as bob_repost_created
\gset
\if :bob_repost_created
  \echo BOB_REPOST_CREATED=PASS
\else
  \echo BOB_REPOST_CREATED=FAIL
  \quit 1
\endif

select public.vvip_social_repost_post(:'original_post_id'::uuid, 'friends') as duplicate_repost
\gset
select (
  :'duplicate_repost'::jsonb->>'created' = 'false'
  and (:'duplicate_repost'::jsonb->>'repost_post_id')::uuid = :'repost_post_id'::uuid
  and :'duplicate_repost'::jsonb->>'audience' = 'friends'
) as repost_idempotent
\gset
\if :repost_idempotent
  \echo REPOST_IDEMPOTENT=PASS
\else
  \echo REPOST_IDEMPOTENT=FAIL
  \quit 1
\endif

-- Widening and repost chains fail closed.
do $proof$
begin
  begin
    perform public.vvip_social_repost_post(
      current_setting('tiger.share_save.original_post_id')::uuid,
      'public'
    );
    raise exception 'EXPECTED_REPOST_WIDENING_REJECTION';
  exception when others then
    if position('SOCIAL_REPOST_AUDIENCE_WIDENING_FORBIDDEN' in sqlerrm) = 0 then
      raise;
    end if;
  end;

  begin
    perform public.vvip_social_repost_post(
      current_setting('tiger.share_save.repost_post_id')::uuid,
      'friends'
    );
    raise exception 'EXPECTED_REPOST_CHAIN_REJECTION';
  exception when others then
    if position('SOCIAL_REPOST_CHAIN_FORBIDDEN' in sqlerrm) = 0 then
      raise;
    end if;
  end;
end;
$proof$;
\echo REPOST_WIDENING_AND_CHAIN_DENIAL=PASS
reset role;

-- Charlie accepts Bob's request. Charlie can satisfy Bob's repost audience but not the
-- original Alice friends-only audience, so the intersection must deny the repost.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_charlie01"}', true);
select public.vvip_upsert_my_social_profile('Charlie Share Proof', null, null, 'Amman', null, 'Share/save rehearsal actor');
update public.vvip_social_relationships
set relationship_state = 'friends'
where requester_subject = 'user_bob001'
  and addressee_subject = 'user_charlie01'
  and relationship_state = 'pending';
reset role;

select (
  public.vvip_social_can_view_post(:'repost_post_id'::uuid, 'user_alice01')
  and public.vvip_social_can_view_post(:'repost_post_id'::uuid, 'user_bob001')
  and not public.vvip_social_can_view_post(:'repost_post_id'::uuid, 'user_charlie01')
) as repost_privacy_intersection
\gset
\if :repost_privacy_intersection
  \echo REPOST_PRIVACY_INTERSECTION=PASS
\else
  \echo REPOST_PRIVACY_INTERSECTION=FAIL
  \quit 1
\endif

-- Charlie cannot save an original post that Charlie cannot see.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_charlie01"}', true);
do $proof$
begin
  begin
    perform public.vvip_social_save_post(
      current_setting('tiger.share_save.original_post_id')::uuid
    );
    raise exception 'EXPECTED_INVISIBLE_BOOKMARK_REJECTION';
  exception when others then
    if position('SOCIAL_POST_NOT_VISIBLE' in sqlerrm) = 0 then
      raise;
    end if;
  end;
end;
$proof$;
\echo INVISIBLE_BOOKMARK_DENIED=PASS
reset role;

-- Bob cannot rewrite the repost snapshot to impersonate Alice.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_bob001"}', true);
do $proof$
begin
  begin
    update public.vvip_social_posts
       set body = 'spoofed-original'
     where post_id = current_setting('tiger.share_save.repost_post_id')::uuid;
    raise exception 'EXPECTED_REPOST_SNAPSHOT_REJECTION';
  exception when others then
    if position('SOCIAL_REPOST_SNAPSHOT_IMMUTABLE' in sqlerrm) = 0 then
      raise;
    end if;
  end;
end;
$proof$;
\echo REPOST_SNAPSHOT_IMMUTABLE=PASS

select (public.vvip_social_unsave_post(:'original_post_id'::uuid)->>'saved' = 'false') as bob_unsave_post
\gset
\if :bob_unsave_post
  \echo BOB_UNSAVE_POST=PASS
\else
  \echo BOB_UNSAVE_POST=FAIL
  \quit 1
\endif
reset role;

-- Original edits synchronize the immutable repost snapshot.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_alice01"}', true);
update public.vvip_social_posts
set body = 'friends-original-v2'
where post_id = :'original_post_id'::uuid;
reset role;

select (
  (select body from public.vvip_social_posts where post_id = :'repost_post_id'::uuid) = 'friends-original-v2'
) as repost_snapshot_tracks_original
\gset
\if :repost_snapshot_tracks_original
  \echo REPOST_SNAPSHOT_TRACKS_ORIGINAL=PASS
\else
  \echo REPOST_SNAPSHOT_TRACKS_ORIGINAL=FAIL
  \quit 1
\endif

-- Deleting the original preserves lineage but makes the repost fail closed for everyone.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_alice01"}', true);
delete from public.vvip_social_posts where post_id = :'original_post_id'::uuid;
reset role;

select (
  exists (
    select 1 from public.vvip_social_reposts
    where original_post_id = :'original_post_id'::uuid
      and repost_post_id = :'repost_post_id'::uuid
  )
  and exists (select 1 from public.vvip_social_posts where post_id = :'repost_post_id'::uuid)
  and not public.vvip_social_can_view_post(:'repost_post_id'::uuid, 'user_alice01')
  and not public.vvip_social_can_view_post(:'repost_post_id'::uuid, 'user_bob001')
) as deleted_original_fails_closed
\gset
\if :deleted_original_fails_closed
  \echo DELETED_ORIGINAL_FAILS_CLOSED=PASS
\else
  \echo DELETED_ORIGINAL_FAILS_CLOSED=FAIL
  \quit 1
\endif

rollback;
\echo TIGER_SOCIAL_SHARE_SAVE_DB_BEHAVIOR=PASS
