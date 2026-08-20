\set ON_ERROR_STOP on

begin;

-- ---------------------------------------------------------------------------
-- Reservation authority + idempotency + fail-fast function configuration.
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_gate2_alice"}', true);

insert into public.vvip_social_posts (body, audience)
values ('gate2-canonical-proof-a', 'public')
returning post_id as post_a \gset

select *
from public.vvip_social_media_reserve_upload(
  :'post_a'::uuid,
  'gate2-idempotency-proof-0001'
) \gset a1_

select *
from public.vvip_social_media_reserve_upload(
  :'post_a'::uuid,
  'gate2-idempotency-proof-0001'
) \gset a2_

select (:'a1_media_id' = :'a2_media_id' and :'a1_ticket_id' = :'a2_ticket_id') as reservation_idempotent \gset
\if :reservation_idempotent
  \echo GATE2_RESERVATION_IDEMPOTENCY=PASS
\else
  \echo GATE2_RESERVATION_IDEMPOTENCY=FAIL
  \quit 1
\endif

reset role;

select exists (
  select 1
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'vvip_social_media_reserve_upload'
    and coalesce(p.proconfig, array[]::text[]) @> array['lock_timeout=2s']::text[]
) as reservation_lock_budget \gset
\if :reservation_lock_budget
  \echo GATE2_RESERVATION_LOCK_BUDGET=PASS
\else
  \echo GATE2_RESERVATION_LOCK_BUDGET=FAIL
  \quit 1
\endif

select (
  not has_function_privilege(
    'authenticated',
    'public.vvip_social_media_webhook_accept_storage(text,text,text,text)',
    'EXECUTE'
  )
  and has_function_privilege(
    'service_role',
    'public.vvip_social_media_webhook_accept_storage(text,text,text,text)',
    'EXECUTE'
  )
) as storage_ingress_privilege \gset
\if :storage_ingress_privilege
  \echo GATE2_STORAGE_INGRESS_PRIVILEGE=PASS
\else
  \echo GATE2_STORAGE_INGRESS_PRIVILEGE=FAIL
  \quit 1
\endif

-- ---------------------------------------------------------------------------
-- Trusted Storage event -> inbox -> claim -> atomic READY + Passport.
-- ---------------------------------------------------------------------------
set local role service_role;
select *
from public.vvip_social_media_webhook_accept_storage(
  '11111111-1111-4111-8111-111111111111',
  repeat('1', 64),
  'social-private-media',
  :'a1_quarantine_storage_path'
) \gset event_a_

select * from public.vvip_social_media_webhook_claim() \gset claim_a_

select public.vvip_social_media_finalize_event(
  :'claim_a_event_id'::uuid,
  :'claim_a_media_id'::uuid,
  :'claim_a_attempt_count'::smallint,
  repeat('b', 64),
  'image/jpeg',
  100000,
  1600,
  1200,
  'canonical/media/aa/' || :'claim_a_media_id' || '.jpg',
  repeat('a', 64),
  80000,
  'image/jpeg',
  1600,
  1200,
  'gate2-db-rehearsal',
  '2026.08.20'
) as canonical_path_a \gset
reset role;

select (
  asset.media_state = 'ready'
  and passport.media_id = asset.media_id
  and inbox.event_state = 'completed'
  and asset.canonical_width = 1600
  and asset.canonical_height = 1200
  and asset.canonical_mime_type = 'image/jpeg'
) as atomic_ready
from public.vvip_social_media_assets asset
join public.vvip_social_media_passports passport using (media_id)
join public.vvip_social_media_webhook_inbox inbox on inbox.media_id = asset.media_id
where asset.media_id = :'claim_a_media_id'::uuid
\gset
\if :atomic_ready
  \echo GATE2_ATOMIC_READY_PASSPORT_EVENT=PASS
\else
  \echo GATE2_ATOMIC_READY_PASSPORT_EVENT=FAIL
  \quit 1
\endif

-- Replay of the exact same trusted Storage event must return the same event binding.
set local role service_role;
select *
from public.vvip_social_media_webhook_accept_storage(
  '11111111-1111-4111-8111-111111111111',
  repeat('1', 64),
  'social-private-media',
  :'a1_quarantine_storage_path'
) \gset event_a_replay_
reset role;

select (:'event_a_event_id' = :'event_a_replay_event_id') as storage_event_idempotent \gset
\if :storage_event_idempotent
  \echo GATE2_STORAGE_EVENT_IDEMPOTENCY=PASS
\else
  \echo GATE2_STORAGE_EVENT_IDEMPOTENCY=FAIL
  \quit 1
\endif

-- ---------------------------------------------------------------------------
-- Equal canonical bytes are evidence, not a global ownership key.
-- A second media object may legitimately have the same canonical digest.
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_gate2_alice"}', true);
insert into public.vvip_social_posts (body, audience)
values ('gate2-canonical-proof-b', 'public')
returning post_id as post_b \gset
select *
from public.vvip_social_media_reserve_upload(
  :'post_b'::uuid,
  'gate2-idempotency-proof-0002'
) \gset b_
reset role;

set local role service_role;
select *
from public.vvip_social_media_webhook_accept_storage(
  '22222222-2222-4222-8222-222222222222',
  repeat('2', 64),
  'social-private-media',
  :'b_quarantine_storage_path'
) \gset event_b_
select * from public.vvip_social_media_webhook_claim() \gset claim_b_
select public.vvip_social_media_finalize_event(
  :'claim_b_event_id'::uuid,
  :'claim_b_media_id'::uuid,
  :'claim_b_attempt_count'::smallint,
  repeat('b', 64),
  'image/jpeg',
  100000,
  1600,
  1200,
  'canonical/media/aa/' || :'claim_b_media_id' || '.jpg',
  repeat('a', 64),
  80000,
  'image/jpeg',
  1600,
  1200,
  'gate2-db-rehearsal',
  '2026.08.20'
) as canonical_path_b \gset
reset role;

select (count(*) = 2) as duplicate_digest_allowed
from public.vvip_social_media_passports
where canonical_sha256 = repeat('a', 64)
\gset
\if :duplicate_digest_allowed
  \echo GATE2_DUPLICATE_DIGEST_OWNERSHIP_SAFE=PASS
\else
  \echo GATE2_DUPLICATE_DIGEST_OWNERSHIP_SAFE=FAIL
  \quit 1
\endif

-- ---------------------------------------------------------------------------
-- Deterministic bounded DLQ after five claimed attempts. Test advances only the
-- durable DB schedule; production worker never controls the retry clock.
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_gate2_alice"}', true);
insert into public.vvip_social_posts (body, audience)
values ('gate2-dlq-proof', 'only_me')
returning post_id as post_dlq \gset
select *
from public.vvip_social_media_reserve_upload(
  :'post_dlq'::uuid,
  'gate2-idempotency-proof-dlq1'
) \gset d_
reset role;

set local role service_role;
select *
from public.vvip_social_media_webhook_accept_storage(
  '33333333-3333-4333-8333-333333333333',
  repeat('3', 64),
  'social-private-media',
  :'d_quarantine_storage_path'
) \gset event_d_
select * from public.vvip_social_media_webhook_claim() \gset d_claim1_
select public.vvip_social_media_webhook_fail(:'d_claim1_event_id'::uuid, :'d_claim1_attempt_count'::smallint, 'REHEARSAL_FAILURE_1') as d_state1 \gset
reset role;

update public.vvip_social_media_webhook_inbox set next_attempt_at = statement_timestamp() - interval '1 second' where event_id = :'event_d_event_id'::uuid;
set local role service_role;
select * from public.vvip_social_media_webhook_claim() \gset d_claim2_
select public.vvip_social_media_webhook_fail(:'d_claim2_event_id'::uuid, :'d_claim2_attempt_count'::smallint, 'REHEARSAL_FAILURE_2') as d_state2 \gset
reset role;

update public.vvip_social_media_webhook_inbox set next_attempt_at = statement_timestamp() - interval '1 second' where event_id = :'event_d_event_id'::uuid;
set local role service_role;
select * from public.vvip_social_media_webhook_claim() \gset d_claim3_
select public.vvip_social_media_webhook_fail(:'d_claim3_event_id'::uuid, :'d_claim3_attempt_count'::smallint, 'REHEARSAL_FAILURE_3') as d_state3 \gset
reset role;

update public.vvip_social_media_webhook_inbox set next_attempt_at = statement_timestamp() - interval '1 second' where event_id = :'event_d_event_id'::uuid;
set local role service_role;
select * from public.vvip_social_media_webhook_claim() \gset d_claim4_
select public.vvip_social_media_webhook_fail(:'d_claim4_event_id'::uuid, :'d_claim4_attempt_count'::smallint, 'REHEARSAL_FAILURE_4') as d_state4 \gset
reset role;

update public.vvip_social_media_webhook_inbox set next_attempt_at = statement_timestamp() - interval '1 second' where event_id = :'event_d_event_id'::uuid;
set local role service_role;
select * from public.vvip_social_media_webhook_claim() \gset d_claim5_
select public.vvip_social_media_webhook_fail(:'d_claim5_event_id'::uuid, :'d_claim5_attempt_count'::smallint, 'REHEARSAL_FAILURE_5') as d_state5 \gset
reset role;

select (
  inbox.event_state = 'dead_letter'
  and inbox.attempt_count = 5
  and asset.media_state = 'failed'
  and :'d_state5' = 'dead_letter'
) as dlq_bounded
from public.vvip_social_media_webhook_inbox inbox
join public.vvip_social_media_assets asset on asset.media_id = inbox.media_id
where inbox.event_id = :'event_d_event_id'::uuid
\gset
\if :dlq_bounded
  \echo GATE2_BOUNDED_DLQ=PASS
\else
  \echo GATE2_BOUNDED_DLQ=FAIL
  \quit 1
\endif

-- ---------------------------------------------------------------------------
-- Hard-kill recovery + claim-generation fencing. A worker abandoned in
-- processing for five minutes is requeued, then a stale previous generation is
-- unable to fail/finalize the newly claimed generation. An abandoned fifth
-- attempt terminates in DLQ rather than overflowing attempt_count.
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_gate2_alice"}', true);
insert into public.vvip_social_posts (body, audience)
values ('gate2-stale-worker-proof', 'only_me')
returning post_id as post_stale \gset
select *
from public.vvip_social_media_reserve_upload(
  :'post_stale'::uuid,
  'gate2-idempotency-stale-0001'
) \gset stale_
reset role;

set local role service_role;
select *
from public.vvip_social_media_webhook_accept_storage(
  '55555555-5555-4555-8555-555555555555',
  repeat('5', 64),
  'social-private-media',
  :'stale_quarantine_storage_path'
) \gset stale_event_
select * from public.vvip_social_media_webhook_claim() \gset stale_claim1_
reset role;

update public.vvip_social_media_webhook_inbox
set locked_at = statement_timestamp() - interval '6 minutes'
where event_id = :'stale_event_event_id'::uuid;

-- No Vault secrets are present, but dispatcher must still recover the stale DB lease.
select (public.vvip_social_media_dispatch_worker() is null) as stale_dispatch_no_network \gset
select (
  event_state = 'pending'
  and attempt_count = 1
  and locked_at is null
  and last_error_code = 'SOCIAL_MEDIA_WORKER_LEASE_EXPIRED'
) as stale_requeued
from public.vvip_social_media_webhook_inbox
where event_id = :'stale_event_event_id'::uuid
\gset
\if :stale_requeued
  \echo GATE2_STALE_WORKER_RECOVERY=PASS
\else
  \echo GATE2_STALE_WORKER_RECOVERY=FAIL
  \quit 1
\endif

set local role service_role;
select * from public.vvip_social_media_webhook_claim() \gset stale_claim2_
reset role;

select (:'stale_claim2_attempt_count'::integer = 2) as stale_generation_advanced \gset
\if :stale_generation_advanced
  \echo GATE2_STALE_WORKER_GENERATION_ADVANCE=PASS
\else
  \echo GATE2_STALE_WORKER_GENERATION_ADVANCE=FAIL
  \quit 1
\endif

select set_config('tiger.gate2.stale_event', :'stale_event_event_id', true);
do $gate2_stale$
begin
  begin
    perform public.vvip_social_media_webhook_fail(
      current_setting('tiger.gate2.stale_event')::uuid,
      1::smallint,
      'STALE_WORKER_MUST_NOT_MUTATE'
    );
    raise exception 'GATE2_STALE_FENCE_DID_NOT_REJECT';
  exception
    when others then
      if sqlerrm <> 'SOCIAL_MEDIA_WORKER_CLAIM_STALE' then
        raise;
      end if;
  end;
end;
$gate2_stale$;
\echo GATE2_STALE_WORKER_FENCE=PASS

select (
  pg_get_functiondef(
    'public.vvip_social_media_finalize_event(uuid,uuid,smallint,text,text,integer,integer,integer,text,text,integer,text,integer,integer,text,text)'::regprocedure
  ) like '%attempt_count <> expected_attempt_count%'
  and pg_get_functiondef(
    'public.vvip_social_media_webhook_fail(uuid,smallint,text)'::regprocedure
  ) like '%attempt_count <> expected_attempt_count%'
) as stale_both_mutations_fenced \gset
\if :stale_both_mutations_fenced
  \echo GATE2_STALE_FINALIZE_FAIL_FENCED=PASS
\else
  \echo GATE2_STALE_FINALIZE_FAIL_FENCED=FAIL
  \quit 1
\endif

-- Simulate hard death on the fifth claim generation. Recovery must dead-letter
-- directly and must never try to produce attempt_count=6.
update public.vvip_social_media_webhook_inbox
set attempt_count = 5,
    locked_at = statement_timestamp() - interval '6 minutes'
where event_id = :'stale_event_event_id'::uuid
  and event_state = 'processing';

select (public.vvip_social_media_dispatch_worker() is null) as stale_fifth_dispatch_no_network \gset
select (
  inbox.event_state = 'dead_letter'
  and inbox.attempt_count = 5
  and inbox.last_error_code = 'SOCIAL_MEDIA_WORKER_LEASE_EXPIRED'
  and asset.media_state = 'failed'
) as stale_fifth_dead_letter
from public.vvip_social_media_webhook_inbox inbox
join public.vvip_social_media_assets asset on asset.media_id = inbox.media_id
where inbox.event_id = :'stale_event_event_id'::uuid
\gset
\if :stale_fifth_dead_letter
  \echo GATE2_STALE_FIFTH_ATTEMPT_DLQ=PASS
\else
  \echo GATE2_STALE_FIFTH_ATTEMPT_DLQ=FAIL
  \quit 1
\endif

-- ---------------------------------------------------------------------------
-- Durable worker dispatch: cron exists, browser/service API roles cannot invoke
-- the dispatcher, and a due event remains pending when Vault activation secrets
-- are intentionally absent in this isolated rehearsal.
-- ---------------------------------------------------------------------------
select exists (
  select 1
  from cron.job
  where jobname = 'tiger-social-media-finalizer-dispatch'
    and schedule = '5 seconds'
    and command like '%vvip_social_media_dispatch_worker%'
) as worker_cron_registered \gset
\if :worker_cron_registered
  \echo GATE2_WORKER_CRON_REGISTERED=PASS
\else
  \echo GATE2_WORKER_CRON_REGISTERED=FAIL
  \quit 1
\endif

select (
  not has_function_privilege('authenticated', 'public.vvip_social_media_dispatch_worker()', 'EXECUTE')
  and not has_function_privilege('service_role', 'public.vvip_social_media_dispatch_worker()', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.vvip_social_media_recover_stale_processing(integer)', 'EXECUTE')
  and not has_function_privilege('service_role', 'public.vvip_social_media_recover_stale_processing(integer)', 'EXECUTE')
) as worker_dispatch_private \gset
\if :worker_dispatch_private
  \echo GATE2_WORKER_DISPATCH_PRIVATE=PASS
\else
  \echo GATE2_WORKER_DISPATCH_PRIVATE=FAIL
  \quit 1
\endif

select (count(*) = 0) as worker_vault_unconfigured
from vault.decrypted_secrets
where name in ('tiger_social_media_worker_url', 'tiger_media_worker_secret')
\gset
\if :worker_vault_unconfigured
  \echo GATE2_WORKER_VAULT_LOCAL_EMPTY=PASS
\else
  \echo GATE2_WORKER_VAULT_LOCAL_EMPTY=FAIL
  \quit 1
\endif

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_gate2_alice"}', true);
insert into public.vvip_social_posts (body, audience)
values ('gate2-dispatch-proof', 'only_me')
returning post_id as post_dispatch \gset
select *
from public.vvip_social_media_reserve_upload(
  :'post_dispatch'::uuid,
  'gate2-idempotency-dispatch-0001'
) \gset dispatch_
reset role;

set local role service_role;
select *
from public.vvip_social_media_webhook_accept_storage(
  '44444444-4444-4444-8444-444444444444',
  repeat('4', 64),
  'social-private-media',
  :'dispatch_quarantine_storage_path'
) \gset dispatch_event_
reset role;

select (public.vvip_social_media_dispatch_worker() is null) as worker_dispatch_fail_closed \gset
select (
  event_state = 'pending'
  and attempt_count = 0
) as worker_event_preserved
from public.vvip_social_media_webhook_inbox
where event_id = :'dispatch_event_event_id'::uuid
\gset
\if :worker_dispatch_fail_closed
  \if :worker_event_preserved
    \echo GATE2_WORKER_DISPATCH_FAIL_CLOSED=PASS
  \else
    \echo GATE2_WORKER_EVENT_PRESERVATION=FAIL
    \quit 1
  \endif
\else
  \echo GATE2_WORKER_DISPATCH_FAIL_CLOSED=FAIL
  \quit 1
\endif

rollback;
\echo TIGER_GATE2_DB_REHEARSAL=PASS
