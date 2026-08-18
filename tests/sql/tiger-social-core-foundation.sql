\set ON_ERROR_STOP on

begin;

-- Alice creates one public, one friends-only and one only-me post, then sends Bob a request.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_alice"}', true);

insert into public.vvip_social_posts (body, audience)
values
  ('social-public-proof', 'public'),
  ('social-friends-proof', 'friends'),
  ('social-only-me-proof', 'only_me');

insert into public.vvip_social_relationships (addressee_subject)
values ('user_bob');

select (count(*) = 1) as alice_request_visible
from public.vvip_social_relationships
where requester_subject = 'user_alice'
  and addressee_subject = 'user_bob'
  and relationship_state = 'pending'
\gset
\if :alice_request_visible
  \echo ALICE_REQUEST_VISIBLE=PASS
\else
  \echo ALICE_REQUEST_VISIBLE=FAIL
  \quit 1
\endif

reset role;

-- Bob can see and accept the request, then gains friends-only visibility.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_bob"}', true);

update public.vvip_social_relationships
set relationship_state = 'friends'
where requester_subject = 'user_alice'
  and addressee_subject = 'user_bob'
  and relationship_state = 'pending';

select (count(*) = 1) as bob_can_read_friend_post
from public.vvip_social_posts
where body = 'social-friends-proof'
\gset
\if :bob_can_read_friend_post
  \echo BOB_CAN_READ_FRIEND_POST=PASS
\else
  \echo BOB_CAN_READ_FRIEND_POST=FAIL
  \quit 1
\endif

select (count(*) = 0) as only_me_is_owner_only
from public.vvip_social_posts
where body = 'social-only-me-proof'
\gset
\if :only_me_is_owner_only
  \echo ONLY_ME_IS_OWNER_ONLY=PASS
\else
  \echo ONLY_ME_IS_OWNER_ONLY=FAIL
  \quit 1
\endif

select (count(*) = 1) as bob_can_read_public_post
from public.vvip_social_posts
where body = 'social-public-proof'
\gset
\if :bob_can_read_public_post
  \echo BOB_CAN_READ_PUBLIC_POST=PASS
\else
  \echo BOB_CAN_READ_PUBLIC_POST=FAIL
  \quit 1
\endif

reset role;

-- Charlie is not a participant in the relationship and must not inherit friend visibility.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_charlie"}', true);

select (count(*) = 0) as charlie_cannot_read_friend_post
from public.vvip_social_posts
where body = 'social-friends-proof'
\gset
\if :charlie_cannot_read_friend_post
  \echo CHARLIE_CANNOT_READ_FRIEND_POST=PASS
\else
  \echo CHARLIE_CANNOT_READ_FRIEND_POST=FAIL
  \quit 1
\endif

select (count(*) = 0) as charlie_cannot_read_only_me
from public.vvip_social_posts
where body = 'social-only-me-proof'
\gset
\if :charlie_cannot_read_only_me
  \echo CHARLIE_CANNOT_READ_ONLY_ME=PASS
\else
  \echo CHARLIE_CANNOT_READ_ONLY_ME=FAIL
  \quit 1
\endif

select (count(*) = 1) as charlie_can_read_public_post
from public.vvip_social_posts
where body = 'social-public-proof'
\gset
\if :charlie_can_read_public_post
  \echo CHARLIE_CAN_READ_PUBLIC_POST=PASS
\else
  \echo CHARLIE_CAN_READ_PUBLIC_POST=FAIL
  \quit 1
\endif

reset role;

-- Bob removes the friendship. Friends-only visibility must disappear immediately.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_bob"}', true);

delete from public.vvip_social_relationships
where requester_subject = 'user_alice'
  and addressee_subject = 'user_bob'
  and relationship_state = 'friends';

select (count(*) = 0) as bob_loses_friend_visibility_after_unfriend
from public.vvip_social_posts
where body = 'social-friends-proof'
\gset
\if :bob_loses_friend_visibility_after_unfriend
  \echo BOB_LOSES_FRIEND_VISIBILITY_AFTER_UNFRIEND=PASS
\else
  \echo BOB_LOSES_FRIEND_VISIBILITY_AFTER_UNFRIEND=FAIL
  \quit 1
\endif

reset role;

ROLLBACK;
\echo TIGER_SOCIAL_DB_BEHAVIOR=PASS
