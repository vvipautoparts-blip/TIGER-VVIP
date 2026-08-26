\set ON_ERROR_STOP on

begin;

-- The forward P0-B boundary removes raw browser CRUD on posts. This proof therefore
-- creates/reads posts only through the safe RPC surface while keeping relationship
-- transition coverage on the existing RLS-protected relationship table.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_alice01"}', true);
select public.vvip_upsert_my_social_profile(
  'Alice Social Proof', null, null, 'Amman', null, 'Social Core rehearsal actor'
);

select public.vvip_social_post_create('social-public-proof', 'public');
select public.vvip_social_post_create('social-friends-proof', 'friends');
select public.vvip_social_post_create('social-only-me-proof', 'only_me');

insert into public.vvip_social_relationships (addressee_subject)
values ('user_bob001');

select (count(*) = 1) as alice_request_visible
from public.vvip_social_relationships
where requester_subject = 'user_alice01'
  and addressee_subject = 'user_bob001'
  and relationship_state = 'pending'
\gset
\if :alice_request_visible
  \echo ALICE_REQUEST_VISIBLE=PASS
\else
  \echo ALICE_REQUEST_VISIBLE=FAIL
  \quit 1
\endif

reset role;

-- Bob becomes an active profile actor, accepts Alice's request, and gains friends-only visibility.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_bob001"}', true);
select public.vvip_upsert_my_social_profile(
  'Bob Social Proof', null, null, 'Amman', null, 'Social Core rehearsal actor'
);

update public.vvip_social_relationships
set relationship_state = 'friends'
where requester_subject = 'user_alice01'
  and addressee_subject = 'user_bob001'
  and relationship_state = 'pending';

select (count(*) = 1) as bob_can_read_friend_post
from public.vvip_social_feed_page(20, null, null)
where body = 'social-friends-proof'
\gset
\if :bob_can_read_friend_post
  \echo BOB_CAN_READ_FRIEND_POST=PASS
\else
  \echo BOB_CAN_READ_FRIEND_POST=FAIL
  \quit 1
\endif

select (count(*) = 0) as only_me_is_owner_only
from public.vvip_social_feed_page(20, null, null)
where body = 'social-only-me-proof'
\gset
\if :only_me_is_owner_only
  \echo ONLY_ME_IS_OWNER_ONLY=PASS
\else
  \echo ONLY_ME_IS_OWNER_ONLY=FAIL
  \quit 1
\endif

select (count(*) = 1) as bob_can_read_public_post
from public.vvip_social_feed_page(20, null, null)
where body = 'social-public-proof'
\gset
\if :bob_can_read_public_post
  \echo BOB_CAN_READ_PUBLIC_POST=PASS
\else
  \echo BOB_CAN_READ_PUBLIC_POST=FAIL
  \quit 1
\endif

reset role;

-- Charlie is active but not a participant and must not inherit friend/owner visibility.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_charlie"}', true);
select public.vvip_upsert_my_social_profile(
  'Charlie Social Proof', null, null, 'Amman', null, 'Social Core rehearsal actor'
);

select (count(*) = 0) as charlie_cannot_read_friend_post
from public.vvip_social_feed_page(20, null, null)
where body = 'social-friends-proof'
\gset
\if :charlie_cannot_read_friend_post
  \echo CHARLIE_CANNOT_READ_FRIEND_POST=PASS
\else
  \echo CHARLIE_CANNOT_READ_FRIEND_POST=FAIL
  \quit 1
\endif

select (count(*) = 0) as charlie_cannot_read_only_me
from public.vvip_social_feed_page(20, null, null)
where body = 'social-only-me-proof'
\gset
\if :charlie_cannot_read_only_me
  \echo CHARLIE_CANNOT_READ_ONLY_ME=PASS
\else
  \echo CHARLIE_CANNOT_READ_ONLY_ME=FAIL
  \quit 1
\endif

select (count(*) = 1) as charlie_can_read_public_post
from public.vvip_social_feed_page(20, null, null)
where body = 'social-public-proof'
\gset
\if :charlie_can_read_public_post
  \echo CHARLIE_CAN_READ_PUBLIC_POST=PASS
\else
  \echo CHARLIE_CAN_READ_PUBLIC_POST=FAIL
  \quit 1
\endif

reset role;

-- Alice must still see her own only_me post through the same safe read boundary.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_alice01"}', true);
select (count(*) = 1) as alice_can_read_only_me
from public.vvip_social_feed_page(20, null, null)
where body = 'social-only-me-proof'
\gset
\if :alice_can_read_only_me
  \echo ALICE_CAN_READ_ONLY_ME=PASS
\else
  \echo ALICE_CAN_READ_ONLY_ME=FAIL
  \quit 1
\endif

reset role;

-- Bob removes the friendship. Friends-only visibility must disappear immediately.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_bob001"}', true);

delete from public.vvip_social_relationships
where requester_subject = 'user_alice01'
  and addressee_subject = 'user_bob001'
  and relationship_state = 'friends';

select (count(*) = 0) as bob_loses_friend_visibility_after_unfriend
from public.vvip_social_feed_page(20, null, null)
where body = 'social-friends-proof'
\gset
\if :bob_loses_friend_visibility_after_unfriend
  \echo BOB_LOSES_FRIEND_VISIBILITY_AFTER_UNFRIEND=PASS
\else
  \echo BOB_LOSES_FRIEND_VISIBILITY_AFTER_UNFRIEND=FAIL
  \quit 1
\endif

reset role;

rollback;
\echo TIGER_SOCIAL_DB_BEHAVIOR=PASS
