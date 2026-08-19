\set ON_ERROR_STOP on

begin;

-- Alice creates a protected post and binds one canonical JPEG metadata row.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_alice"}', true);

insert into public.vvip_social_posts (body, audience)
values ('media-only-me-proof', 'only_me')
returning post_id as only_me_post_id
\gset

insert into public.vvip_social_post_media (
    media_id,
    post_id,
    storage_path,
    mime_type,
    byte_size,
    width,
    height,
    sha256,
    position
)
values (
    '11111111-1111-4111-8111-111111111111',
    :'only_me_post_id'::uuid,
    'user_alice/11111111-1111-4111-8111-111111111111/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.jpg',
    'image/jpeg',
    2048,
    1200,
    900,
    'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    0
);

select (count(*) = 1) as alice_media_metadata_visible
from public.vvip_social_post_media
where media_id = '11111111-1111-4111-8111-111111111111'::uuid
\gset
\if :alice_media_metadata_visible
  \echo SOCIAL_MEDIA_OWNER_METADATA_VISIBLE=PASS
\else
  \echo SOCIAL_MEDIA_OWNER_METADATA_VISIBLE=FAIL
  \quit 1
\endif

reset role;

-- Simulate the already-written storage metadata row without bypassing read policy later.
insert into storage.objects (bucket_id, name)
values (
    'tiger-social-media',
    'user_alice/11111111-1111-4111-8111-111111111111/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.jpg'
);

-- Bob must receive zero rows even with exact media id and exact storage path.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_bob"}', true);

select (count(*) = 0) as bob_metadata_zero
from public.vvip_social_post_media
where media_id = '11111111-1111-4111-8111-111111111111'::uuid
\gset
\if :bob_metadata_zero
  \echo SOCIAL_MEDIA_ONLY_ME_METADATA_ZERO=PASS
\else
  \echo SOCIAL_MEDIA_ONLY_ME_METADATA_ZERO=FAIL
  \quit 1
\endif

select (count(*) = 0) as bob_storage_zero
from storage.objects
where bucket_id = 'tiger-social-media'
  and name = 'user_alice/11111111-1111-4111-8111-111111111111/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.jpg'
\gset
\if :bob_storage_zero
  \echo SOCIAL_MEDIA_ONLY_ME_STORAGE_ZERO=PASS
\else
  \echo SOCIAL_MEDIA_ONLY_ME_STORAGE_ZERO=FAIL
  \quit 1
\endif

reset role;

-- Becoming friends still must not reveal only_me media.
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

select (count(*) = 0) as friend_only_me_metadata_zero
from public.vvip_social_post_media
where media_id = '11111111-1111-4111-8111-111111111111'::uuid
\gset
\if :friend_only_me_metadata_zero
  \echo SOCIAL_MEDIA_FRIEND_ONLY_ME_METADATA_ZERO=PASS
\else
  \echo SOCIAL_MEDIA_FRIEND_ONLY_ME_METADATA_ZERO=FAIL
  \quit 1
\endif

reset role;

-- Alice creates friends-only media.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_alice"}', true);
insert into public.vvip_social_posts (body, audience)
values ('media-friends-proof', 'friends')
returning post_id as friends_post_id
\gset

insert into public.vvip_social_post_media (
    media_id,
    post_id,
    storage_path,
    mime_type,
    byte_size,
    width,
    height,
    sha256,
    position
)
values (
    '22222222-2222-4222-8222-222222222222',
    :'friends_post_id'::uuid,
    'user_alice/22222222-2222-4222-8222-222222222222/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.webp',
    'image/webp',
    3072,
    1200,
    900,
    'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    0
);
reset role;

insert into storage.objects (bucket_id, name)
values (
    'tiger-social-media',
    'user_alice/22222222-2222-4222-8222-222222222222/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.webp'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_bob"}', true);

select (count(*) = 1) as friend_metadata_visible
from public.vvip_social_post_media
where media_id = '22222222-2222-4222-8222-222222222222'::uuid
\gset
\if :friend_metadata_visible
  \echo SOCIAL_MEDIA_FRIEND_METADATA_VISIBLE=PASS
\else
  \echo SOCIAL_MEDIA_FRIEND_METADATA_VISIBLE=FAIL
  \quit 1
\endif

select (count(*) = 1) as friend_storage_visible
from storage.objects
where bucket_id = 'tiger-social-media'
  and name = 'user_alice/22222222-2222-4222-8222-222222222222/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.webp'
\gset
\if :friend_storage_visible
  \echo SOCIAL_MEDIA_FRIEND_STORAGE_VISIBLE=PASS
\else
  \echo SOCIAL_MEDIA_FRIEND_STORAGE_VISIBLE=FAIL
  \quit 1
\endif

-- Bob unfriends; visibility must disappear immediately.
delete from public.vvip_social_relationships
where subject_low = least('user_alice', 'user_bob')
  and subject_high = greatest('user_alice', 'user_bob');

select (count(*) = 0) as post_unfriend_metadata_zero
from public.vvip_social_post_media
where media_id = '22222222-2222-4222-8222-222222222222'::uuid
\gset
\if :post_unfriend_metadata_zero
  \echo SOCIAL_MEDIA_POST_UNFRIEND_METADATA_ZERO=PASS
\else
  \echo SOCIAL_MEDIA_POST_UNFRIEND_METADATA_ZERO=FAIL
  \quit 1
\endif

select (count(*) = 0) as post_unfriend_storage_zero
from storage.objects
where bucket_id = 'tiger-social-media'
  and name = 'user_alice/22222222-2222-4222-8222-222222222222/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.webp'
\gset
\if :post_unfriend_storage_zero
  \echo SOCIAL_MEDIA_POST_UNFRIEND_STORAGE_ZERO=PASS
\else
  \echo SOCIAL_MEDIA_POST_UNFRIEND_STORAGE_ZERO=FAIL
  \quit 1
\endif

reset role;

rollback;
\echo TIGER_SOCIAL_MEDIA_BOUNDARY=PASS
