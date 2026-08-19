\set ON_ERROR_STOP on

begin;

-- Browser roles must have no direct table CRUD authority.
reset role;
select (
  not has_table_privilege('authenticated', 'public.vvip_social_media', 'SELECT')
  and not has_table_privilege('authenticated', 'public.vvip_social_media', 'INSERT')
  and not has_table_privilege('authenticated', 'public.vvip_social_media', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.vvip_social_media', 'DELETE')
  and not has_table_privilege('authenticated', 'public.vvip_social_media_webhook_inbox', 'SELECT')
) as social_media_no_direct_browser_crud
\gset
\if :social_media_no_direct_browser_crud
  \echo SOCIAL_MEDIA_NO_DIRECT_BROWSER_CRUD=PASS
\else
  \echo SOCIAL_MEDIA_NO_DIRECT_BROWSER_CRUD=FAIL
  \quit 1
\endif

select (
  has_function_privilege('authenticated', 'public.vvip_social_media_register(uuid,text,text,integer,integer,integer,text)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.vvip_social_media_remove(uuid)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.vvip_social_media_read(uuid)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.vvip_social_media_webhook_accept(text,text,text)', 'EXECUTE')
  and has_function_privilege('service_role', 'public.vvip_social_media_webhook_accept(text,text,text)', 'EXECUTE')
) as social_media_rpc_boundary
\gset
\if :social_media_rpc_boundary
  \echo SOCIAL_MEDIA_RPC_BOUNDARY=PASS
\else
  \echo SOCIAL_MEDIA_RPC_BOUNDARY=FAIL
  \quit 1
\endif

-- Alice owns three posts and registers media under private actor/post namespaces.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_alice"}', true);

insert into public.vvip_social_posts (body, audience)
values ('media-public-proof', 'public')
returning post_id as public_post_id
\gset

insert into public.vvip_social_posts (body, audience)
values ('media-friends-proof', 'friends')
returning post_id as friends_post_id
\gset

insert into public.vvip_social_posts (body, audience)
values ('media-only-me-proof', 'only_me')
returning post_id as only_me_post_id
\gset

insert into public.vvip_social_relationships (addressee_subject)
values ('user_bob');

select public.vvip_social_media_register(
  :'public_post_id'::uuid,
  'social-private/user_alice/' || :'public_post_id' || '/hero.webp',
  'image/webp',
  2048,
  800,
  600,
  repeat('a', 64)
) as public_media
\gset

select public.vvip_social_media_register(
  :'friends_post_id'::uuid,
  'social-private/user_alice/' || :'friends_post_id' || '/friends.jpg',
  'image/jpeg',
  4096,
  1200,
  800,
  repeat('b', 64)
) as friends_media
\gset

select public.vvip_social_media_register(
  :'only_me_post_id'::uuid,
  'social-private/user_alice/' || :'only_me_post_id' || '/private.webp',
  'image/webp',
  1024,
  640,
  480,
  repeat('c', 64)
) as only_me_media
\gset

select (
  :'public_media'::jsonb->>'storage_path' like 'social-private/user_alice/%'
) as owner_private_path_registered
\gset
\if :owner_private_path_registered
  \echo OWNER_PRIVATE_PATH_REGISTERED=PASS
\else
  \echo OWNER_PRIVATE_PATH_REGISTERED=FAIL
  \quit 1
\endif

-- Invalid cross-owner/private namespace registration must fail closed.
do $block$
begin
  begin
    perform public.vvip_social_media_register(
      :'public_post_id'::uuid,
      'social-private/user_bob/' || :'public_post_id' || '/wrong.webp',
      'image/webp', 100, 320, 240, repeat('d', 64)
    );
    raise exception 'SOCIAL_MEDIA_WRONG_NAMESPACE_WAS_NOT_DENIED';
  exception
    when others then
      if sqlerrm = 'SOCIAL_MEDIA_WRONG_NAMESPACE_WAS_NOT_DENIED' then raise; end if;
      if sqlerrm <> 'SOCIAL_MEDIA_PRIVATE_PATH_REQUIRED' then raise; end if;
  end;
end;
$block$;

reset role;

-- Bob accepts friendship and inherits post visibility for public/friends media only.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_bob"}', true);

update public.vvip_social_relationships
set relationship_state = 'friends'
where requester_subject = 'user_alice'
  and addressee_subject = 'user_bob'
  and relationship_state = 'pending';

select (count(*) = 1) as bob_public_media_visible
from public.vvip_social_media_read(:'public_post_id'::uuid)
\gset
\if :bob_public_media_visible
  \echo BOB_PUBLIC_MEDIA_VISIBLE=PASS
\else
  \echo BOB_PUBLIC_MEDIA_VISIBLE=FAIL
  \quit 1
\endif

select (count(*) = 1) as bob_friend_media_visible
from public.vvip_social_media_read(:'friends_post_id'::uuid)
\gset
\if :bob_friend_media_visible
  \echo BOB_FRIEND_MEDIA_VISIBLE=PASS
\else
  \echo BOB_FRIEND_MEDIA_VISIBLE=FAIL
  \quit 1
\endif

do $block$
begin
  begin
    perform * from public.vvip_social_media_read(:'only_me_post_id'::uuid);
    raise exception 'SOCIAL_MEDIA_ONLY_ME_WAS_NOT_DENIED';
  exception
    when others then
      if sqlerrm = 'SOCIAL_MEDIA_ONLY_ME_WAS_NOT_DENIED' then raise; end if;
      if sqlerrm <> 'SOCIAL_POST_NOT_VISIBLE' then raise; end if;
  end;
end;
$block$;

reset role;

-- Alice blocks Bob; previously visible public/friends media must become unavailable immediately.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_alice"}', true);
select public.vvip_social_block_user('user_bob');
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_bob"}', true);

do $block$
begin
  begin
    perform * from public.vvip_social_media_read(:'public_post_id'::uuid);
    raise exception 'SOCIAL_MEDIA_BLOCK_PUBLIC_WAS_NOT_DENIED';
  exception
    when others then
      if sqlerrm = 'SOCIAL_MEDIA_BLOCK_PUBLIC_WAS_NOT_DENIED' then raise; end if;
      if sqlerrm <> 'SOCIAL_POST_NOT_VISIBLE' then raise; end if;
  end;
end;
$block$;

reset role;

-- Service-only webhook inbox: same key+digest is idempotent; key+different digest conflicts.
set local role service_role;
select public.vvip_social_media_webhook_accept(
  'evt-social-media-00000001',
  'media.object.ready',
  repeat('1', 64)
) as webhook_event_id
\gset

select (
  public.vvip_social_media_webhook_accept(
    'evt-social-media-00000001',
    'media.object.ready',
    repeat('1', 64)
  ) = :'webhook_event_id'::uuid
) as webhook_duplicate_is_idempotent
\gset
\if :webhook_duplicate_is_idempotent
  \echo WEBHOOK_DUPLICATE_IDEMPOTENT=PASS
\else
  \echo WEBHOOK_DUPLICATE_IDEMPOTENT=FAIL
  \quit 1
\endif

do $block$
begin
  begin
    perform public.vvip_social_media_webhook_accept(
      'evt-social-media-00000001',
      'media.object.ready',
      repeat('2', 64)
    );
    raise exception 'WEBHOOK_IDEMPOTENCY_CONFLICT_WAS_NOT_DENIED';
  exception
    when others then
      if sqlerrm = 'WEBHOOK_IDEMPOTENCY_CONFLICT_WAS_NOT_DENIED' then raise; end if;
      if sqlerrm <> 'SOCIAL_MEDIA_WEBHOOK_IDEMPOTENCY_CONFLICT' then raise; end if;
  end;
end;
$block$;

-- Claim/fail five times; scheduler acceleration is performed by postgres between attempts.
select event_id, attempt_count from public.vvip_social_media_webhook_claim()
\gset
select (:'event_id'::uuid = :'webhook_event_id'::uuid and :'attempt_count'::integer = 1) as webhook_first_claim
\gset
\if :webhook_first_claim
  \echo WEBHOOK_FIRST_CLAIM=PASS
\else
  \echo WEBHOOK_FIRST_CLAIM=FAIL
  \quit 1
\endif
select (public.vvip_social_media_webhook_fail(:'webhook_event_id'::uuid, 'TRANSIENT_1') = 'pending') as webhook_retry_one
\gset
\if :webhook_retry_one
  \echo WEBHOOK_RETRY_ONE=PASS
\else
  \echo WEBHOOK_RETRY_ONE=FAIL
  \quit 1
\endif

reset role;
update public.vvip_social_media_webhook_inbox set next_attempt_at = statement_timestamp() - interval '1 second' where event_id = :'webhook_event_id'::uuid;
set local role service_role;

select event_id from public.vvip_social_media_webhook_claim() \gset
select public.vvip_social_media_webhook_fail(:'webhook_event_id'::uuid, 'TRANSIENT_2');
reset role;
update public.vvip_social_media_webhook_inbox set next_attempt_at = statement_timestamp() - interval '1 second' where event_id = :'webhook_event_id'::uuid;
set local role service_role;
select event_id from public.vvip_social_media_webhook_claim() \gset
select public.vvip_social_media_webhook_fail(:'webhook_event_id'::uuid, 'TRANSIENT_3');
reset role;
update public.vvip_social_media_webhook_inbox set next_attempt_at = statement_timestamp() - interval '1 second' where event_id = :'webhook_event_id'::uuid;
set local role service_role;
select event_id from public.vvip_social_media_webhook_claim() \gset
select public.vvip_social_media_webhook_fail(:'webhook_event_id'::uuid, 'TRANSIENT_4');
reset role;
update public.vvip_social_media_webhook_inbox set next_attempt_at = statement_timestamp() - interval '1 second' where event_id = :'webhook_event_id'::uuid;
set local role service_role;
select event_id, attempt_count from public.vvip_social_media_webhook_claim() \gset
select (:'attempt_count'::integer = 5) as webhook_fifth_claim
\gset
\if :webhook_fifth_claim
  \echo WEBHOOK_FIFTH_CLAIM=PASS
\else
  \echo WEBHOOK_FIFTH_CLAIM=FAIL
  \quit 1
\endif
select (public.vvip_social_media_webhook_fail(:'webhook_event_id'::uuid, 'TRANSIENT_5') = 'dead_letter') as webhook_dead_letter
\gset
\if :webhook_dead_letter
  \echo WEBHOOK_DEAD_LETTER=PASS
\else
  \echo WEBHOOK_DEAD_LETTER=FAIL
  \quit 1
\endif

reset role;
select (
  processing_state = 'dead_letter'
  and attempt_count = 5
  and last_error_code = 'TRANSIENT_5'
) as webhook_dead_letter_persisted
from public.vvip_social_media_webhook_inbox
where event_id = :'webhook_event_id'::uuid
\gset
\if :webhook_dead_letter_persisted
  \echo WEBHOOK_DEAD_LETTER_PERSISTED=PASS
\else
  \echo WEBHOOK_DEAD_LETTER_PERSISTED=FAIL
  \quit 1
\endif

rollback;
\echo TIGER_SOCIAL_MEDIA_DB_BEHAVIOR=PASS
