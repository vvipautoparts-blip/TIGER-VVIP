\set ON_ERROR_STOP on

begin;

reset role;
select (
  not has_table_privilege('authenticated', 'public.vvip_social_comments', 'SELECT')
  and not has_table_privilege('authenticated', 'public.vvip_social_comments', 'INSERT')
  and not has_table_privilege('authenticated', 'public.vvip_social_comments', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.vvip_social_comments', 'DELETE')
) as comments_no_direct_browser_crud
\gset
\if :comments_no_direct_browser_crud
  \echo COMMENTS_NO_DIRECT_BROWSER_CRUD=PASS
\else
  \echo COMMENTS_NO_DIRECT_BROWSER_CRUD=FAIL
  \quit 1
\endif

select (
  has_function_privilege('authenticated', 'public.vvip_social_comment_list(uuid,uuid,timestamptz,uuid,integer)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.vvip_social_comment_create(uuid,text,uuid)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.vvip_social_comment_update(uuid,text)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.vvip_social_comment_remove(uuid)', 'EXECUTE')
) as comments_rpc_boundary
\gset
\if :comments_rpc_boundary
  \echo COMMENTS_RPC_BOUNDARY=PASS
\else
  \echo COMMENTS_RPC_BOUNDARY=FAIL
  \quit 1
\endif

create temporary table social_comment_test_context (
  key text primary key,
  value uuid not null
) on commit drop;
grant select on social_comment_test_context to authenticated;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_alice01"}', true);
select public.vvip_upsert_my_social_profile(
  'Alice Comment Proof', null, null, 'Amman', null, 'Comment rehearsal actor'
);

select (public.vvip_social_post_create('comment-public-proof', 'public')->>'post_id')::uuid as public_post_id
\gset
select (public.vvip_social_post_create('comment-other-public-proof', 'public')->>'post_id')::uuid as other_public_post_id
\gset
select (public.vvip_social_post_create('comment-friends-proof', 'friends')->>'post_id')::uuid as friends_post_id
\gset
select (public.vvip_social_post_create('comment-only-me-proof', 'only_me')->>'post_id')::uuid as only_me_post_id
\gset

insert into public.vvip_social_relationships (addressee_subject)
values ('user_bob001');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_bob001"}', true);
select public.vvip_upsert_my_social_profile(
  'Bob Comment Proof', null, null, 'Amman', null, 'Comment rehearsal actor'
);

update public.vvip_social_relationships
set relationship_state = 'friends'
where requester_subject = 'user_alice01'
  and addressee_subject = 'user_bob001'
  and relationship_state = 'pending';

select public.vvip_social_comment_create(
  :'public_post_id'::uuid,
  'bob-public-comment',
  null
) as bob_comment
\gset

select (
  :'bob_comment'::jsonb->>'ok' = 'true'
  and :'bob_comment'::jsonb->'item'->>'body' = 'bob-public-comment'
  and position('user_bob' in :'bob_comment') = 0
) as comment_create_owner_bound
\gset
\if :comment_create_owner_bound
  \echo COMMENT_CREATE_OWNER_BOUND=PASS
\else
  \echo COMMENT_CREATE_OWNER_BOUND=FAIL
  \quit 1
\endif

select (:'bob_comment'::jsonb->'item'->>'comment_id')::uuid as bob_comment_id
\gset

select public.vvip_social_comment_create(
  :'public_post_id'::uuid,
  'bob-first-level-reply',
  :'bob_comment_id'::uuid
) as bob_reply
\gset
select (:'bob_reply'::jsonb->'item'->>'comment_id')::uuid as bob_reply_id
\gset

reset role;
insert into social_comment_test_context (key, value) values
  ('public_post', :'public_post_id'::uuid),
  ('other_public_post', :'other_public_post_id'::uuid),
  ('only_me_post', :'only_me_post_id'::uuid),
  ('bob_comment', :'bob_comment_id'::uuid),
  ('bob_reply', :'bob_reply_id'::uuid);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_bob001"}', true);

do $proof$
declare
  v_post uuid := (select value from social_comment_test_context where key = 'public_post');
  v_reply uuid := (select value from social_comment_test_context where key = 'bob_reply');
begin
  begin
    perform public.vvip_social_comment_create(v_post, 'nested-reply-denied', v_reply);
    raise exception 'TEST_EXPECTED_REPLY_DEPTH_DENIAL';
  exception when others then
    if sqlerrm <> 'SOCIAL_COMMENT_REPLY_DEPTH_DENIED' then
      raise;
    end if;
  end;
end;
$proof$;
\echo COMMENT_REPLY_ONE_LEVEL=PASS

do $proof$
declare
  v_post uuid := (select value from social_comment_test_context where key = 'public_post');
  v_rejected boolean := false;
begin
  begin
    perform public.vvip_social_comment_create(v_post, E'\n\t' || U&'\00A0\3000', null);
  exception when others then
    v_rejected := true;
  end;
  if not v_rejected then
    raise exception 'TEST_EXPECTED_COMMENT_UNICODE_WHITESPACE_REJECTION';
  end if;
end;
$proof$;
\echo COMMENT_UNICODE_WHITESPACE_REJECTED=PASS

select (
  public.vvip_social_comment_create(
    :'public_post_id'::uuid,
    repeat(U&'\D83D\DE00', 2000),
    null
  )->>'ok' = 'true'
) as comment_astral_max_accepted
\gset
\if :comment_astral_max_accepted
\else
  \echo COMMENT_ASTRAL_BOUNDARY=FAIL
  \quit 1
\endif

do $proof$
declare
  v_post uuid := (select value from social_comment_test_context where key = 'public_post');
  v_rejected boolean := false;
begin
  begin
    perform public.vvip_social_comment_create(v_post, repeat(U&'\D83D\DE00', 2001), null);
  exception when others then
    v_rejected := true;
  end;
  if not v_rejected then
    raise exception 'TEST_EXPECTED_COMMENT_ASTRAL_LIMIT_REJECTION';
  end if;
end;
$proof$;
\echo COMMENT_ASTRAL_BOUNDARY=PASS

do $proof$
declare
  v_other_post uuid := (select value from social_comment_test_context where key = 'other_public_post');
  v_parent uuid := (select value from social_comment_test_context where key = 'bob_comment');
begin
  begin
    perform public.vvip_social_comment_create(v_other_post, 'cross-post-reply-denied', v_parent);
    raise exception 'TEST_EXPECTED_PARENT_POST_DENIAL';
  exception when others then
    if sqlerrm <> 'SOCIAL_COMMENT_PARENT_POST_MISMATCH' then
      raise;
    end if;
  end;
end;
$proof$;
\echo COMMENT_REPLY_SAME_POST=PASS

select (
  public.vvip_social_comment_update(:'bob_comment_id'::uuid, 'bob-updated-comment')->'item'->>'body'
  = 'bob-updated-comment'
) as bob_updates_own_comment
\gset
\if :bob_updates_own_comment
\else
  \echo COMMENT_UPDATE_OWNER_ONLY=FAIL
  \quit 1
\endif

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_charlie"}', true);
select public.vvip_upsert_my_social_profile(
  'Charlie Comment Proof', null, null, 'Amman', null, 'Comment rehearsal actor'
);

select (
  public.vvip_social_comment_list(
    :'public_post_id'::uuid,
    null,
    null,
    null,
    20
  )->>'page_count' = '2'
) as public_comment_list_visible
\gset
\if :public_comment_list_visible
  \echo COMMENT_LIST_VISIBILITY=PASS
\else
  \echo COMMENT_LIST_VISIBILITY=FAIL
  \quit 1
\endif

do $proof$
declare
  v_comment uuid := (select value from social_comment_test_context where key = 'bob_comment');
begin
  begin
    perform public.vvip_social_comment_update(v_comment, 'charlie-cannot-update');
    raise exception 'TEST_EXPECTED_UPDATE_OWNER_DENIAL';
  exception when others then
    if sqlerrm <> 'SOCIAL_COMMENT_OWNER_REQUIRED' then
      raise;
    end if;
  end;
end;
$proof$;
\echo COMMENT_UPDATE_OWNER_ONLY=PASS

do $proof$
declare
  v_comment uuid := (select value from social_comment_test_context where key = 'bob_comment');
begin
  begin
    perform public.vvip_social_comment_remove(v_comment);
    raise exception 'TEST_EXPECTED_REMOVE_OWNER_DENIAL';
  exception when others then
    if sqlerrm <> 'SOCIAL_COMMENT_OWNER_REQUIRED' then
      raise;
    end if;
  end;
end;
$proof$;
\echo COMMENT_REMOVE_OWNER_ONLY=PASS

do $proof$
declare
  v_post uuid := (select value from social_comment_test_context where key = 'only_me_post');
begin
  begin
    perform public.vvip_social_comment_list(v_post, null, null, null, 20);
    raise exception 'TEST_EXPECTED_HIDDEN_POST_DENIAL';
  exception when others then
    if sqlerrm <> 'SOCIAL_COMMENT_POST_NOT_VISIBLE' then
      raise;
    end if;
  end;
end;
$proof$;
\echo COMMENT_HIDDEN_POST_DENIED=PASS

reset role;

insert into public.vvip_social_comments (post_id, parent_comment_id, author_subject, body)
select
  (select value from social_comment_test_context where key = 'public_post'),
  null,
  'user_bob',
  'bounded-parent-' || series::text
from generate_series(1, 21) series;

insert into public.vvip_social_comments (post_id, parent_comment_id, author_subject, body)
select
  (select value from social_comment_test_context where key = 'public_post'),
  (select value from social_comment_test_context where key = 'bob_comment'),
  'user_bob',
  'bounded-reply-' || series::text
from generate_series(1, 21) series;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_charlie"}', true);

select public.vvip_social_comment_list(
  :'public_post_id'::uuid,
  null,
  null,
  null,
  999
) as parent_page_one
\gset

select (
  :'parent_page_one'::jsonb->>'page_count' = '20'
  and jsonb_array_length(:'parent_page_one'::jsonb->'items') = 20
  and :'parent_page_one'::jsonb->'next_cursor' <> 'null'::jsonb
) as parent_page_bounded
\gset
\if :parent_page_bounded
  \echo COMMENT_PARENT_PAGE_BOUND=PASS
\else
  \echo COMMENT_PARENT_PAGE_BOUND=FAIL
  \quit 1
\endif

select public.vvip_social_comment_list(
  :'public_post_id'::uuid,
  null,
  (:'parent_page_one'::jsonb->'next_cursor'->>'created_at')::timestamptz,
  (:'parent_page_one'::jsonb->'next_cursor'->>'comment_id')::uuid,
  999
) as parent_page_two
\gset

select (
  :'parent_page_two'::jsonb->>'page_count' = '3'
  and :'parent_page_two'::jsonb->'next_cursor' = 'null'::jsonb
) as parent_next_cursor_valid
\gset
\if :parent_next_cursor_valid
  \echo COMMENT_NEXT_CURSOR=PASS
\else
  \echo COMMENT_NEXT_CURSOR=FAIL
  \quit 1
\endif

select (
  :'parent_page_one'::jsonb->'items'->19->>'created_at'
    = :'parent_page_one'::jsonb->'next_cursor'->>'created_at'
  and :'parent_page_one'::jsonb->'items'->19->>'comment_id'
    = :'parent_page_one'::jsonb->'next_cursor'->>'comment_id'
  and not exists (
    select 1
    from jsonb_array_elements(:'parent_page_one'::jsonb->'items') page_one(item)
    join jsonb_array_elements(:'parent_page_two'::jsonb->'items') page_two(item)
      on page_one.item->>'comment_id' = page_two.item->>'comment_id'
  )
) as atomic_page_snapshot
\gset
\if :atomic_page_snapshot
  \echo COMMENT_ATOMIC_PAGE_SNAPSHOT=PASS
\else
  \echo COMMENT_ATOMIC_PAGE_SNAPSHOT=FAIL
  \quit 1
\endif

select public.vvip_social_comment_list(
  :'public_post_id'::uuid,
  :'bob_comment_id'::uuid,
  null,
  null,
  999
) as reply_page_one
\gset

select (
  :'reply_page_one'::jsonb->>'page_count' = '20'
  and jsonb_array_length(:'reply_page_one'::jsonb->'items') = 20
  and :'reply_page_one'::jsonb->'next_cursor' <> 'null'::jsonb
) as reply_page_bounded
\gset
\if :reply_page_bounded
  \echo COMMENT_REPLY_PAGE_BOUND=PASS
\else
  \echo COMMENT_REPLY_PAGE_BOUND=FAIL
  \quit 1
\endif

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_bob001"}', true);

select
  public.vvip_marketplace_actor_id() as final_bob_actor,
  public.vvip_social_actor_active() as final_bob_active,
  public.vvip_get_my_social_profile() as final_bob_profile
\gset

\echo FINAL_BOB_ACTOR=:final_bob_actor
\echo FINAL_BOB_ACTIVE=:final_bob_active
\echo FINAL_BOB_PROFILE=:final_bob_profile

select (
  :'final_bob_actor' = 'user_bob001'
  and :'final_bob_active'::boolean
  and :'final_bob_profile'::jsonb->>'status' = 'profile_loaded'
  and :'final_bob_profile'::jsonb->'profile'->>'profile_state' = 'active'
) as final_bob_context_valid
\gset
\if :final_bob_context_valid
  \echo FINAL_BOB_CONTEXT=PASS
\else
  \echo FINAL_BOB_CONTEXT=FAIL
  \quit 1
\endif

select public.vvip_social_comment_remove(:'bob_reply_id'::uuid) as bob_remove_result
\gset

reset role;
select (
  :'bob_remove_result'::jsonb->>'ok' = 'true'
  and not exists (
    select 1 from public.vvip_social_comments
    where comment_id = :'bob_reply_id'::uuid
  )
) as bob_removes_own_reply
\gset
\if :bob_removes_own_reply
  \echo COMMENT_REMOVE_OWNER_ONLY=PASS
\else
  \echo COMMENT_REMOVE_OWNER_ONLY=FAIL
  \quit 1
\endif

rollback;
\echo TIGER_SOCIAL_COMMENTS_DB_BEHAVIOR=PASS