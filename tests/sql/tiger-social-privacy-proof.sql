\set ON_ERROR_STOP on

begin;

-- Alice owns the protected object.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_alice"}', true);

insert into public.vvip_social_posts (body, audience)
values ('privacy-proof-only-me', 'only_me')
returning post_id as protected_post_id
\gset

select (count(*) = 1) as owner_can_read_only_me
from public.vvip_social_posts
where post_id = :'protected_post_id'::uuid
  and author_subject = 'user_alice'
  and audience = 'only_me'
\gset
\if :owner_can_read_only_me
  \echo PRIVACY_DB_OWNER_CAN_READ_ONLY_ME=PASS
\else
  \echo PRIVACY_DB_OWNER_CAN_READ_ONLY_ME=FAIL
  \quit 1
\endif

reset role;

-- Bob has no relationship and must receive zero rows even by exact object id.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_bob"}', true);

select (count(*) = 0) as bob_exact_id_zero_rows
from public.vvip_social_posts
where post_id = :'protected_post_id'::uuid
\gset
\if :bob_exact_id_zero_rows
  \echo PRIVACY_DB_UNAUTHORIZED_EXACT_ID_ROWS_ZERO=PASS
\else
  \echo PRIVACY_DB_UNAUTHORIZED_EXACT_ID_ROWS_ZERO=FAIL
  \quit 1
\endif

select (count(*) = 0) as bob_feed_zero_rows
from public.vvip_social_posts
where body = 'privacy-proof-only-me'
\gset
\if :bob_feed_zero_rows
  \echo PRIVACY_DB_UNAUTHORIZED_FEED_ROWS_ZERO=PASS
\else
  \echo PRIVACY_DB_UNAUTHORIZED_FEED_ROWS_ZERO=FAIL
  \quit 1
\endif

reset role;

-- Even an accepted friend must not receive only_me data.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_alice"}', true);
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

select (count(*) = 0) as friend_exact_id_zero_rows
from public.vvip_social_posts
where post_id = :'protected_post_id'::uuid
\gset
\if :friend_exact_id_zero_rows
  \echo PRIVACY_DB_FRIEND_EXACT_ID_ROWS_ZERO=PASS
\else
  \echo PRIVACY_DB_FRIEND_EXACT_ID_ROWS_ZERO=FAIL
  \quit 1
\endif

reset role;

rollback;
\echo TIGER_PRIVACY_DATABASE_PROOF=PASS
