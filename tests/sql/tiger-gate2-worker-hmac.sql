\set ON_ERROR_STOP on

begin;

select (
  not has_table_privilege('authenticated', 'public.vvip_social_media_worker_challenges', 'SELECT')
  and not has_table_privilege('service_role', 'public.vvip_social_media_worker_challenges', 'SELECT')
  and not has_function_privilege(
    'authenticated',
    'public.vvip_social_media_consume_worker_challenge(text,bigint)',
    'EXECUTE'
  )
  and has_function_privilege(
    'service_role',
    'public.vvip_social_media_consume_worker_challenge(text,bigint)',
    'EXECUTE'
  )
) as hmac_surface_private \gset
\if :hmac_surface_private
  \echo GATE2_HMAC_SURFACE_PRIVATE=PASS
\else
  \echo GATE2_HMAC_SURFACE_PRIVATE=FAIL
  \quit 1
\endif

select floor(extract(epoch from statement_timestamp()))::bigint as hmac_ts \gset

insert into public.vvip_social_media_worker_challenges (
  nonce,
  issued_at_epoch,
  expires_at
) values (
  '0123456789abcdef0123456789abcdef',
  :'hmac_ts'::bigint,
  statement_timestamp() + interval '90 seconds'
);

set local role service_role;
select public.vvip_social_media_consume_worker_challenge(
  '0123456789abcdef0123456789abcdef',
  :'hmac_ts'::bigint
) as hmac_first_use \gset
reset role;

\if :hmac_first_use
  \echo GATE2_HMAC_FIRST_USE=PASS
\else
  \echo GATE2_HMAC_FIRST_USE=FAIL
  \quit 1
\endif

set local role service_role;
select not public.vvip_social_media_consume_worker_challenge(
  '0123456789abcdef0123456789abcdef',
  :'hmac_ts'::bigint
) as hmac_replay_denied \gset
reset role;

\if :hmac_replay_denied
  \echo GATE2_HMAC_REPLAY_DENIED=PASS
\else
  \echo GATE2_HMAC_REPLAY_DENIED=FAIL
  \quit 1
\endif

select (:'hmac_ts'::bigint - 120) as expired_ts \gset
insert into public.vvip_social_media_worker_challenges (
  nonce,
  issued_at_epoch,
  expires_at,
  created_at
) values (
  'fedcba9876543210fedcba9876543210',
  :'expired_ts'::bigint,
  statement_timestamp() - interval '1 second',
  statement_timestamp() - interval '2 minutes'
);

set local role service_role;
select not public.vvip_social_media_consume_worker_challenge(
  'fedcba9876543210fedcba9876543210',
  :'expired_ts'::bigint
) as hmac_expired_denied \gset
reset role;

\if :hmac_expired_denied
  \echo GATE2_HMAC_EXPIRED_DENIED=PASS
\else
  \echo GATE2_HMAC_EXPIRED_DENIED=FAIL
  \quit 1
\endif

select (
  consumed_at is not null
  and expires_at > created_at
) as hmac_consumption_persisted
from public.vvip_social_media_worker_challenges
where nonce = '0123456789abcdef0123456789abcdef'
\gset

\if :hmac_consumption_persisted
  \echo GATE2_HMAC_CONSUMPTION_PERSISTED=PASS
\else
  \echo GATE2_HMAC_CONSUMPTION_PERSISTED=FAIL
  \quit 1
\endif

rollback;

\echo TIGER_GATE2_HMAC_DB_REHEARSAL=PASS
