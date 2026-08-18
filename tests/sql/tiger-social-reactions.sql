\set ON_ERROR_STOP on

begin;

-- Browser-facing authenticated role has no direct CRUD authority on the reaction table.
reset role;
select (
  not has_table_privilege('authenticated', 'public.vvip_social_reactions', 'SELECT')
  and not has_table_privilege('authenticated', 'public.vvip_social_reactions', 'INSERT')
  and not has_table_privilege('authenticated', 'public.vvip_social_reactions', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.vvip_social_reactions', 'DELETE')
) as reactions_no_direct_browser_crud
\gset
\if :reactions_no_direct_browser_crud
  \echo REACTIONS_NO_DIRECT_BROWSER_CRUD=PASS
\else
  \echo REACTIONS_NO_DIRECT_BROWSER_CRUD=FAIL
  \quit 1
\endif

select (
  has_function_privilege('authenticated', 'public.vvip_social_reaction_summary(uuid)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.vvip_social_set_reaction(uuid,text)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.vvip_social_remove_reaction(uuid)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.vvip_social_can_view_post(uuid,text)', 'EXECUTE')
) as reactions_rpc_boundary
\gset
\if :reactions_rpc_boundary
  \echo REACTIONS_RPC_BOUNDARY=PASS
\else
  \echo REACTIONS_RPC_BOUNDARY=FAIL
  \quit 1
\endif

-- Alice creates three posts and sends Bob a friend request.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_alice"}', true);

insert into public.vvip_social_posts (body, audience)
values ('reaction-public-proof', 'public')
returning post_id as public_post_id
\gset

insert into public.vvip_social_posts (body, audience)
values ('reaction-friends-proof', 'friends')
returning post_id as friends_post_id
\gset

insert into public.vvip_social_posts (body, audience)
values ('reaction-only-me-proof', 'only_me')
returning post_id as only_me_post_id
\gset

insert into public.vvip_social_relationships (addressee_subject)
values ('user_bob');

reset role;

-- Bob accepts the friendship and can react to visible public/friends posts.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_bob"}', true);

update public.vvip_social_relationships
set relationship_state = 'friends'
where requester_subject = 'user_alice'
  and addressee_subject = 'user_bob'
  and relationship_state = 'pending';

select (
  public.vvip_social_set_reaction(:'public_post_id'::uuid, 'like')->>'viewer_reaction' = 'like'
) as bob_like_public
\gset
\if :bob_like_public
  \echo BOB_LIKE_PUBLIC=PASS
\else
  \echo BOB_LIKE_PUBLIC=FAIL
  \quit 1
\endif

-- Changing reaction is an upsert, not a second reaction row.
select public.vvip_social_set_reaction(:'public_post_id'::uuid, 'love') as public_love_summary
\gset
select (
  (:'public_love_summary'::jsonb->>'total')::integer = 1
  and :'public_love_summary'::jsonb->>'viewer_reaction' = 'love'
  and (:'public_love_summary'::jsonb->'counts'->>'love')::integer = 1
) as reaction_upsert_is_single_row
\gset
\if :reaction_upsert_is_single_row
  \echo REACTION_UPSERT_SINGLE_ROW=PASS
\else
  \echo REACTION_UPSERT_SINGLE_ROW=FAIL
  \quit 1
\endif

select (
  public.vvip_social_set_reaction(:'friends_post_id'::uuid, 'support')->>'viewer_reaction' = 'support'
) as bob_support_friend_post
\gset
\if :bob_support_friend_post
  \echo BOB_SUPPORT_FRIEND_POST=PASS
\else
  \echo BOB_SUPPORT_FRIEND_POST=FAIL
  \quit 1
\endif

select public.vvip_social_reaction_summary(:'public_post_id'::uuid) as public_summary
\gset
select (position('user_bob' in :'public_summary') = 0) as summary_has_no_raw_actor
\gset
\if :summary_has_no_raw_actor
  \echo REACTION_SUMMARY_MINIMUM_TRUTH=PASS
\else
  \echo REACTION_SUMMARY_MINIMUM_TRUTH=FAIL
  \quit 1
\endif

select (
  public.vvip_social_remove_reaction(:'public_post_id'::uuid)->>'total' = '0'
) as bob_remove_own_reaction
\gset
\if :bob_remove_own_reaction
  \echo BOB_REMOVE_OWN_REACTION=PASS
\else
  \echo BOB_REMOVE_OWN_REACTION=FAIL
  \quit 1
\endif

reset role;

-- Visibility helper proves the RPC authorization boundary without granting it to browsers.
select (
  public.vvip_social_can_view_post(:'public_post_id'::uuid, 'user_bob')
  and public.vvip_social_can_view_post(:'friends_post_id'::uuid, 'user_bob')
  and not public.vvip_social_can_view_post(:'only_me_post_id'::uuid, 'user_bob')
  and public.vvip_social_can_view_post(:'public_post_id'::uuid, 'user_charlie')
  and not public.vvip_social_can_view_post(:'friends_post_id'::uuid, 'user_charlie')
) as reaction_visibility_boundary
\gset
\if :reaction_visibility_boundary
  \echo REACTION_VISIBILITY_BOUNDARY=PASS
\else
  \echo REACTION_VISIBILITY_BOUNDARY=FAIL
  \quit 1
\endif

-- Removing friendship immediately removes friends-only reaction eligibility.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_bob"}', true);
delete from public.vvip_social_relationships
where requester_subject = 'user_alice'
  and addressee_subject = 'user_bob'
  and relationship_state = 'friends';
reset role;

select (
  not public.vvip_social_can_view_post(:'friends_post_id'::uuid, 'user_bob')
) as friend_reaction_eligibility_revoked
\gset
\if :friend_reaction_eligibility_revoked
  \echo FRIEND_REACTION_ELIGIBILITY_REVOKED=PASS
\else
  \echo FRIEND_REACTION_ELIGIBILITY_REVOKED=FAIL
  \quit 1
\endif

rollback;
\echo TIGER_SOCIAL_REACTIONS_DB_BEHAVIOR=PASS
