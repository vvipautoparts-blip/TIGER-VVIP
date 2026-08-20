\set ON_ERROR_STOP on

begin;

-- Register Alice's first synthetic endpoint through the authenticated RPC boundary.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_alice"}', true);
select set_config(
    'tiger.gate4_endpoint_result',
    public.vvip_notification_register_endpoint(
        'fake',
        'test',
        'fake:accepted:alice-device-0001'
    )::text,
    true
);
select set_config(
    'tiger.gate4_endpoint_id',
    current_setting('tiger.gate4_endpoint_result')::jsonb->>'endpoint_id',
    true
);
reset role;

-- One canonical business event must create exactly one durable notification.
select set_config(
    'tiger.gate4_notification_1',
    (public.vvip_notification_create(
        'user_alice','gate4:event:1','social_reaction','social.reaction',
        '{"reaction":"like"}'::jsonb,'post','post-1','user_bob',null
    )->>'notification_id'),
    true
);
select (
    (public.vvip_notification_create(
        'user_alice','gate4:event:1','social_reaction','social.reaction',
        '{"reaction":"like"}'::jsonb,'post','post-1','user_bob',null
    )->>'notification_id') = current_setting('tiger.gate4_notification_1')
) as idempotent_notification
\gset
\if :idempotent_notification
  \echo IDEMPOTENT_NOTIFICATION=PASS
\else
  \echo IDEMPOTENT_NOTIFICATION=FAIL
  \quit 1
\endif

select set_config(
    'tiger.gate4_notification_2',
    (public.vvip_notification_create(
        'user_alice','gate4:event:2','social_comment','social.comment',
        '{"comment_id":"comment-2"}'::jsonb,'post','post-2','user_bob',null
    )->>'notification_id'),
    true
);

select (
    count(*) = 2
    and min(sequence) = 1
    and max(sequence) = 2
    and count(distinct sequence) = 2
) as monotonic_sequence
from public.vvip_notifications notification
join public.vvip_notification_inboxes inbox on inbox.inbox_id = notification.inbox_id
where inbox.owner_subject = 'user_alice'
  and notification.event_key in ('gate4:event:1','gate4:event:2')
\gset
\if :monotonic_sequence
  \echo MONOTONIC_SEQUENCE=PASS
\else
  \echo MONOTONIC_SEQUENCE=FAIL
  \quit 1
\endif

-- Bob cannot mutate Alice's durable notification even when he knows its opaque UUID.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_bob"}', true);
do $third_party$
declare
    v_denied boolean := false;
begin
    begin
        perform public.vvip_notification_mark_read(
            current_setting('tiger.gate4_notification_1')::uuid
        );
    exception
        when raise_exception then
            if sqlerrm = 'TIGER_NOTIFICATION_NOT_FOUND' then
                v_denied := true;
            else
                raise;
            end if;
    end;
    if not v_denied then
        raise exception 'TIGER_GATE4_THIRD_PARTY_MUTATION_NOT_DENIED';
    end if;
end;
$third_party$;
\echo THIRD_PARTY_DENIED=PASS
reset role;

-- Legacy Global V1 notification table remains historical but browser authority is closed.
select (
    not has_table_privilege('authenticated','public.vvip_notification_events','SELECT')
    and not has_table_privilege('authenticated','public.vvip_notification_events','UPDATE')
    and not has_table_privilege('authenticated','public.vvip_notification_events','INSERT')
    and not has_table_privilege('authenticated','public.vvip_notification_events','DELETE')
) as legacy_authority_closed
\gset
\if :legacy_authority_closed
  \echo LEGACY_AUTHORITY_CLOSED=PASS
\else
  \echo LEGACY_AUTHORITY_CLOSED=FAIL
  \quit 1
\endif

-- Read transitions are monotonic and unread_count remains transactionally consistent.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_alice"}', true);
select public.vvip_notification_mark_read(current_setting('tiger.gate4_notification_1')::uuid);
select public.vvip_notification_mark_read(current_setting('tiger.gate4_notification_1')::uuid);
select public.vvip_notification_mark_all_read(2);
reset role;

select (
    inbox.unread_count = 0
    and (select count(*) from public.vvip_notifications n where n.inbox_id = inbox.inbox_id and n.sequence <= 2 and n.read_at is not null) = 2
) as unread_consistent
from public.vvip_notification_inboxes inbox
where inbox.owner_subject = 'user_alice'
\gset
\if :unread_consistent
  \echo UNREAD_CONSISTENT=PASS
\else
  \echo UNREAD_CONSISTENT=FAIL
  \quit 1
\endif

-- Optional categories can be disabled, but mandatory security/system durability cannot.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_alice"}', true);
select public.vvip_notification_update_preference(
    'social_reaction',false,false,false,null,null,'UTC'
);
reset role;

select set_config(
    'tiger.gate4_optional_disabled_result',
    public.vvip_notification_create(
        'user_alice','gate4:event:optional-disabled','social_reaction','social.reaction',
        '{}'::jsonb,'post','post-disabled','user_bob',null
    )::text,
    true
);
select (
    current_setting('tiger.gate4_optional_disabled_result')::jsonb->>'decision' = 'disabled_optional_category'
    and not exists (
        select 1 from public.vvip_notifications where event_key = 'gate4:event:optional-disabled'
    )
) as optional_disable
\gset
\if :optional_disable
  \echo OPTIONAL_DISABLE=PASS
\else
  \echo OPTIONAL_DISABLE=FAIL
  \quit 1
\endif

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_alice"}', true);
select public.vvip_notification_update_preference(
    'security_account',false,false,false,null,null,'UTC'
);
reset role;

select set_config(
    'tiger.gate4_security_result',
    public.vvip_notification_create(
        'user_alice','gate4:event:security','security_account','security.account',
        '{"safe_code":"account-change"}'::jsonb,'security','account','user_bob',null
    )::text,
    true
);
select (
    (current_setting('tiger.gate4_security_result')::jsonb->>'created')::boolean
    and exists (
        select 1 from public.vvip_notification_preferences
        where owner_subject = 'user_alice' and category = 'security_account' and in_app_enabled
    )
    and exists (select 1 from public.vvip_notifications where event_key = 'gate4:event:security')
) as mandatory_durable
\gset
\if :mandatory_durable
  \echo MANDATORY_DURABLE=PASS
\else
  \echo MANDATORY_DURABLE=FAIL
  \quit 1
\endif

-- A fresh same-view lease suppresses redundant push only; durable persistence remains.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_alice"}', true);
select public.vvip_notification_update_activity_hint(true,'post','same-object');
reset role;
select set_config(
    'tiger.gate4_same_view_result',
    public.vvip_notification_create(
        'user_alice','gate4:event:same-view','social_comment','social.comment',
        '{}'::jsonb,'post','same-object','user_bob',null
    )::text,
    true
);
select (
    (current_setting('tiger.gate4_same_view_result')::jsonb->>'created')::boolean
    and (current_setting('tiger.gate4_same_view_result')::jsonb->>'same_view_suppressed')::boolean
    and (current_setting('tiger.gate4_same_view_result')::jsonb->>'dispatch_count')::integer = 0
    and exists (select 1 from public.vvip_notifications where event_key = 'gate4:event:same-view')
) as same_view_suppress_push
\gset
\if :same_view_suppress_push
  \echo SAME_VIEW_SUPPRESS_PUSH=PASS
\else
  \echo SAME_VIEW_SUPPRESS_PUSH=FAIL
  \quit 1
\endif

-- Once the activity hint is stale, it cannot suppress normal background push decisions.
update public.vvip_notification_activity_leases
set lease_expires_at = statement_timestamp() - interval '1 second'
where owner_subject = 'user_alice';
select set_config(
    'tiger.gate4_stale_lease_result',
    public.vvip_notification_create(
        'user_alice','gate4:event:stale-lease','social_comment','social.comment',
        '{}'::jsonb,'post','same-object','user_bob',null
    )::text,
    true
);
select (
    (current_setting('tiger.gate4_stale_lease_result')::jsonb->>'created')::boolean
    and not (current_setting('tiger.gate4_stale_lease_result')::jsonb->>'same_view_suppressed')::boolean
    and (current_setting('tiger.gate4_stale_lease_result')::jsonb->>'dispatch_count')::integer > 0
) as stale_lease_background
\gset
\if :stale_lease_background
  \echo STALE_LEASE_BACKGROUND=PASS
\else
  \echo STALE_LEASE_BACKGROUND=FAIL
  \quit 1
\endif

-- Defense in depth: message/private payloads are rendered as generic push previews.
select (
    public.vvip_notification_push_preview(
        'social_message','private','social.message',
        '{"body":"TIGER_SECRET_MESSAGE_BODY"}'::jsonb
    )->>'body' = 'You have a new message'
    and public.vvip_notification_push_preview(
        'social_message','private','social.message',
        '{"body":"TIGER_SECRET_MESSAGE_BODY"}'::jsonb
    )::text not like '%TIGER_SECRET_MESSAGE_BODY%'
) as private_preview_redacted
\gset
\if :private_preview_redacted
  \echo PRIVATE_PREVIEW_REDACTED=PASS
\else
  \echo PRIVATE_PREVIEW_REDACTED=FAIL
  \quit 1
\endif

-- Endpoint capability cannot be silently rebound across accounts.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_bob"}', true);
do $endpoint_owner$
declare
    v_denied boolean := false;
begin
    begin
        perform public.vvip_notification_register_endpoint(
            'fake','test','fake:accepted:alice-device-0001'
        );
    exception
        when raise_exception then
            if sqlerrm = 'TIGER_NOTIFICATION_ENDPOINT_OWNERSHIP_CONFLICT' then
                v_denied := true;
            else
                raise;
            end if;
    end;
    if not v_denied then
        raise exception 'TIGER_GATE4_ENDPOINT_REBIND_NOT_DENIED';
    end if;
end;
$endpoint_owner$;
\echo ENDPOINT_OWNER_BOUND=PASS
reset role;

select (
    not has_table_privilege('authenticated','public.vvip_notification_endpoints','SELECT')
    and not (current_setting('tiger.gate4_endpoint_result')::jsonb ? 'endpoint_capability')
) as endpoint_secret_hidden
\gset
\if :endpoint_secret_hidden
  \echo ENDPOINT_SECRET_HIDDEN=PASS
\else
  \echo ENDPOINT_SECRET_HIDDEN=FAIL
  \quit 1
\endif

-- Durable nonce memory closes HMAC replay after a valid signature has been checked by the worker.
select public.vvip_notification_consume_worker_challenge(
    'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    extract(epoch from statement_timestamp())::bigint
) as worker_nonce_first_use
\gset
\if :worker_nonce_first_use
  \echo WORKER_NONCE_FIRST_USE=PASS
\else
  \echo WORKER_NONCE_FIRST_USE=FAIL
  \quit 1
\endif

select (not public.vvip_notification_consume_worker_challenge(
    'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    extract(epoch from statement_timestamp())::bigint
)) as worker_nonce_replay_denied
\gset
\if :worker_nonce_replay_denied
  \echo WORKER_NONCE_REPLAY_DENIED=PASS
\else
  \echo WORKER_NONCE_REPLAY_DENIED=FAIL
  \quit 1
\endif

select (not public.vvip_notification_consume_worker_challenge(
    'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    extract(epoch from statement_timestamp())::bigint - 61
)) as worker_nonce_expired_denied
\gset
\if :worker_nonce_expired_denied
  \echo WORKER_NONCE_EXPIRED_DENIED=PASS
\else
  \echo WORKER_NONCE_EXPIRED_DENIED=FAIL
  \quit 1
\endif

-- A crashed worker lease is fenced; the old generation can never settle after recovery.
select set_config('tiger.gate4_stale_dispatch', dispatch_id::text, true),
       set_config('tiger.gate4_stale_generation', generation::text, true)
from public.vvip_notification_claim_dispatches(1,'gate4-stale-worker');
update public.vvip_notification_dispatches
set lease_expires_at = statement_timestamp() - interval '1 second'
where dispatch_id = current_setting('tiger.gate4_stale_dispatch')::uuid;
select count(*) from public.vvip_notification_claim_dispatches(1,'gate4-recovery-worker');
do $stale_worker$
declare
    v_denied boolean := false;
begin
    begin
        perform public.vvip_notification_settle_dispatch(
            current_setting('tiger.gate4_stale_dispatch')::uuid,
            current_setting('tiger.gate4_stale_generation')::bigint,
            'accepted','stale-ref',null,null
        );
    exception
        when raise_exception then
            if sqlerrm = 'TIGER_NOTIFICATION_STALE_WORKER' then
                v_denied := true;
            else
                raise;
            end if;
    end;
    if not v_denied then raise exception 'TIGER_GATE4_STALE_WORKER_SETTLED'; end if;
end;
$stale_worker$;
\echo STALE_WORKER_DENIED=PASS

-- Isolate retry tests from older queued work.
update public.vvip_notification_dispatches
set state = 'suppressed', generation = generation + 1, lease_owner = null, lease_expires_at = null
where state in ('pending','retry_wait','leased');

-- Fifth retryable attempt terminates in DLQ.
select set_config(
    'tiger.gate4_retry_notification',
    (public.vvip_notification_create(
        'user_alice','gate4:event:retry-budget','social_comment','social.comment',
        '{}'::jsonb,'post','retry-post','user_bob',statement_timestamp() + interval '1 hour'
    )->>'notification_id'),
    true
);
update public.vvip_notification_dispatches
set attempt_count = 4, next_attempt_at = statement_timestamp()
where notification_id = current_setting('tiger.gate4_retry_notification')::uuid;
select set_config('tiger.gate4_retry_dispatch', dispatch_id::text, true),
       set_config('tiger.gate4_retry_generation', generation::text, true)
from public.vvip_notification_claim_dispatches(1,'gate4-retry-worker');
select (
    public.vvip_notification_settle_dispatch(
        current_setting('tiger.gate4_retry_dispatch')::uuid,
        current_setting('tiger.gate4_retry_generation')::bigint,
        'retryable',null,'synthetic_retry',null
    )->>'state' = 'dead_letter'
) as retry_budget_dlq
\gset
\if :retry_budget_dlq
  \echo RETRY_BUDGET_DLQ=PASS
\else
  \echo RETRY_BUDGET_DLQ=FAIL
  \quit 1
\endif

-- Invalid endpoint result is terminal and invalidates that endpoint.
select set_config(
    'tiger.gate4_invalid_notification',
    (public.vvip_notification_create(
        'user_alice','gate4:event:invalid-endpoint','social_comment','social.comment',
        '{}'::jsonb,'post','invalid-post','user_bob',statement_timestamp() + interval '1 hour'
    )->>'notification_id'),
    true
);
select set_config('tiger.gate4_invalid_dispatch', dispatch_id::text, true),
       set_config('tiger.gate4_invalid_generation', generation::text, true)
from public.vvip_notification_claim_dispatches(1,'gate4-invalid-worker');
select set_config(
    'tiger.gate4_invalid_settlement',
    public.vvip_notification_settle_dispatch(
        current_setting('tiger.gate4_invalid_dispatch')::uuid,
        current_setting('tiger.gate4_invalid_generation')::bigint,
        'endpoint_invalid',null,'synthetic_invalid',null
    )::text,
    true
);
select (
    current_setting('tiger.gate4_invalid_settlement')::jsonb->>'state' = 'invalid_endpoint'
    and exists (
        select 1 from public.vvip_notification_endpoints
        where endpoint_id = current_setting('tiger.gate4_endpoint_id')::uuid and state = 'invalid'
    )
) as invalid_endpoint_terminal
\gset
\if :invalid_endpoint_terminal
  \echo INVALID_ENDPOINT_TERMINAL=PASS
\else
  \echo INVALID_ENDPOINT_TERMINAL=FAIL
  \quit 1
\endif

-- Add a second active endpoint for TTL and kill-switch tests.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_alice"}', true);
select set_config(
    'tiger.gate4_endpoint_2',
    (public.vvip_notification_register_endpoint(
        'fake','test','fake:accepted:alice-device-0002'
    )->>'endpoint_id'),
    true
);
reset role;

-- TTL expiry after claim is still terminal before settlement can accept it.
select set_config(
    'tiger.gate4_ttl_notification',
    (public.vvip_notification_create(
        'user_alice','gate4:event:ttl','social_comment','social.comment',
        '{}'::jsonb,'post','ttl-post','user_bob',statement_timestamp() + interval '1 hour'
    )->>'notification_id'),
    true
);
select set_config('tiger.gate4_ttl_dispatch', dispatch_id::text, true),
       set_config('tiger.gate4_ttl_generation', generation::text, true)
from public.vvip_notification_claim_dispatches(1,'gate4-ttl-worker');
update public.vvip_notification_dispatches
set expires_at = statement_timestamp() - interval '1 second'
where dispatch_id = current_setting('tiger.gate4_ttl_dispatch')::uuid;
select (
    public.vvip_notification_settle_dispatch(
        current_setting('tiger.gate4_ttl_dispatch')::uuid,
        current_setting('tiger.gate4_ttl_generation')::bigint,
        'accepted','should-not-settle',null,null
    )->>'state' = 'expired'
) as ttl_expired_terminal
\gset
\if :ttl_expired_terminal
  \echo TTL_EXPIRED_TERMINAL=PASS
\else
  \echo TTL_EXPIRED_TERMINAL=FAIL
  \quit 1
\endif

-- Global push kill switch suppresses transport without deleting durable notification truth.
select set_config(
    'tiger.gate4_kill_notification',
    (public.vvip_notification_create(
        'user_alice','gate4:event:kill-switch','social_comment','social.comment',
        '{}'::jsonb,'post','kill-post','user_bob',statement_timestamp() + interval '1 hour'
    )->>'notification_id'),
    true
);
select public.vvip_notification_set_kill_switch('global','background_push',true);
select (
    exists (select 1 from public.vvip_notifications where notification_id = current_setting('tiger.gate4_kill_notification')::uuid)
    and exists (
        select 1 from public.vvip_notification_dispatches
        where notification_id = current_setting('tiger.gate4_kill_notification')::uuid and state = 'suppressed'
    )
) as kill_switch_transport_only
\gset
\if :kill_switch_transport_only
  \echo KILL_SWITCH_TRANSPORT_ONLY=PASS
\else
  \echo KILL_SWITCH_TRANSPORT_ONLY=FAIL
  \quit 1
\endif
select public.vvip_notification_set_kill_switch('global','background_push',false);

-- Current private Realtime topic authorizes only its owner and only Broadcast receive semantics.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_alice"}', true);
select set_config(
    'tiger.gate4_topic',
    public.vvip_notification_get_channel_ticket()->>'topic',
    true
);
select public.vvip_notification_realtime_topic_authorized(
    current_setting('tiger.gate4_topic'),'broadcast'
) as alice_realtime_authorized
\gset
\if :alice_realtime_authorized
  \echo REALTIME_ALICE=PASS
\else
  \echo REALTIME_ALICE=FAIL
  \quit 1
\endif
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_bob"}', true);
select (
    not public.vvip_notification_realtime_topic_authorized(current_setting('tiger.gate4_topic'),'broadcast')
    and not public.vvip_notification_realtime_topic_authorized(current_setting('tiger.gate4_topic'),'postgres_changes')
) as realtime_owner_only
\gset
\if :realtime_owner_only
  \echo REALTIME_OWNER_ONLY=PASS
\else
  \echo REALTIME_OWNER_ONLY=FAIL
  \quit 1
\endif
reset role;

select (
    not exists (
        select 1 from pg_policies
        where schemaname = 'realtime'
          and tablename = 'messages'
          and policyname like 'vvip_notification_realtime%'
          and cmd = 'INSERT'
          and roles::text like '%authenticated%'
          and coalesce(with_check,'') ilike '%broadcast%'
    )
) as browser_broadcast_denied
\gset
\if :browser_broadcast_denied
  \echo BROWSER_BROADCAST_DENIED=PASS
\else
  \echo BROWSER_BROADCAST_DENIED=FAIL
  \quit 1
\endif

-- Durable reconnect is keyset-only: after sequence 1, every returned row is strictly newer.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_alice"}', true);
select (
    count(*) > 0
    and min(sequence) > 1
    and count(*) = count(distinct sequence)
) as keyset_catchup
from public.vvip_notification_list(1,100)
\gset
\if :keyset_catchup
  \echo KEYSET_CATCHUP=PASS
\else
  \echo KEYSET_CATCHUP=FAIL
  \quit 1
\endif
reset role;

rollback;
\echo TIGER_GATE4_DB_REHEARSAL=PASS
