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
  has_function_privilege('authenticated', 'public.vvip_social_comment_list(uuid)', 'EXECUTE')
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
select set_config('request.jwt.claims', '{"sub":"user_alice"}', true);

insert into public.vvip_social_posts (body, audience)
values ('comment-public-proof', 'public')
returning post_id as public_post_id
\gset

insert into public.vvip_social_posts (body, audience)
values ('comment-other-public-proof', 'public')
returning post_id as other_public_post_id
\gset

insert into public.vvip_social_posts (body, audience)
values ('comment-friends-proof', 'friends')
returning post_id as friends_post_id
\gset

insert into public.vvip_social_posts (body, audience)
values ('comment-only-me-proof', 'only_me')
returning post_id as only_me_post_id
\gset

insert into public.vvip_social_relationships (addressee_subject)
values ('user_bob');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_bob"}', true);

update public.vvip_social_relationships
set relationship_state = 'friends'
where requester_subject = 'user_alice'
  and addressee_subject = 'user_bob'
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
select set_config('request.jwt.claims', '{"sub":"user_bob"}', true);

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

select (
  public.vvip_social_comment_list(:'public_post_id'::uuid)->>'total' = '2'
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
    perform public.vvip_social_comment_list(v_post);
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
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_bob"}', true);

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
