\set ON_ERROR_STOP on

begin;

-- Establish the only Gate 3 creation prerequisite: an existing friends relationship.
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
reset role;

-- Alice opens the direct conversation twice. Pair uniqueness, not client trust, owns identity.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_alice"}', true);
select set_config(
    'tiger.gate3_conversation_id',
    (public.vvip_social_open_direct_conversation('user_bob', 'open-1')->>'conversation_id'),
    true
);
select (
    (public.vvip_social_open_direct_conversation('user_bob', 'open-2')->>'conversation_id')
    = current_setting('tiger.gate3_conversation_id')
) as friend_open_idempotent
\gset
\if :friend_open_idempotent
  \echo FRIEND_OPEN_IDEMPOTENT=PASS
\else
  \echo FRIEND_OPEN_IDEMPOTENT=FAIL
  \quit 1
\endif
reset role;

select (count(*) = 2) as exactly_two_members
from public.vvip_social_conversation_members
where conversation_id = current_setting('tiger.gate3_conversation_id')::uuid
  and member_subject in ('user_alice', 'user_bob')
  and membership_state = 'active'
\gset
\if :exactly_two_members
  \echo EXACTLY_TWO_MEMBERS=PASS
\else
  \echo EXACTLY_TWO_MEMBERS=FAIL
  \quit 1
\endif

-- A non-friend cannot create a message-request channel implicitly.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_charlie"}', true);
do $non_friend$
declare
    v_denied boolean := false;
begin
    begin
        perform public.vvip_social_open_direct_conversation('user_alice', 'charlie-open');
    exception
        when raise_exception then
            if sqlerrm = 'SOCIAL_MESSAGE_FRIENDSHIP_REQUIRED' then
                v_denied := true;
            else
                raise;
            end if;
    end;
    if not v_denied then
        raise exception 'NON_FRIEND_OPEN_WAS_NOT_DENIED';
    end if;
end;
$non_friend$;
\echo NON_FRIEND_OPEN_DENIED=PASS
reset role;

-- A third party cannot send, read history, or obtain a current private topic.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_charlie"}', true);
do $third_party$
declare
    v_conversation_id uuid := current_setting('tiger.gate3_conversation_id')::uuid;
    v_denied integer := 0;
begin
    begin
        perform public.vvip_social_send_message(
            v_conversation_id,
            '00000000-0000-4000-8000-000000000003'::uuid,
            'third-party-denied'
        );
    exception
        when raise_exception then
            if sqlerrm = 'SOCIAL_CONVERSATION_MEMBER_REQUIRED' then
                v_denied := v_denied + 1;
            else
                raise;
            end if;
    end;

    begin
        perform 1 from public.vvip_social_list_messages(v_conversation_id, 0, 50);
    exception
        when raise_exception then
            if sqlerrm = 'SOCIAL_CONVERSATION_MEMBER_REQUIRED' then
                v_denied := v_denied + 1;
            else
                raise;
            end if;
    end;

    begin
        perform public.vvip_social_get_channel_ticket(v_conversation_id);
    exception
        when raise_exception then
            if sqlerrm = 'SOCIAL_CONVERSATION_MEMBER_REQUIRED' then
                v_denied := v_denied + 1;
            else
                raise;
            end if;
    end;

    if v_denied <> 3 then
        raise exception 'THIRD_PARTY_BOUNDARY_INCOMPLETE:%', v_denied;
    end if;
end;
$third_party$;
\echo THIRD_PARTY_DENIED=PASS
reset role;

-- Durable send is idempotent by client_message_id and sequence allocation is monotonic.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_alice"}', true);
select set_config(
    'tiger.gate3_message_1',
    (public.vvip_social_send_message(
        current_setting('tiger.gate3_conversation_id')::uuid,
        '00000000-0000-4000-8000-000000000001'::uuid,
        'gate3-first'
    )->>'message_id'),
    true
);
select (
    (public.vvip_social_send_message(
        current_setting('tiger.gate3_conversation_id')::uuid,
        '00000000-0000-4000-8000-000000000001'::uuid,
        'gate3-first'
    )->>'message_id') = current_setting('tiger.gate3_message_1')
) as idempotent_send
\gset
\if :idempotent_send
  \echo IDEMPOTENT_SEND=PASS
\else
  \echo IDEMPOTENT_SEND=FAIL
  \quit 1
\endif

select public.vvip_social_send_message(
    current_setting('tiger.gate3_conversation_id')::uuid,
    '00000000-0000-4000-8000-000000000002'::uuid,
    'gate3-second'
);
reset role;

select (
    count(*) = 2
    and min(sequence) = 1
    and max(sequence) = 2
    and count(distinct sequence) = 2
) as monotonic_sequence
from public.vvip_social_messages
where conversation_id = current_setting('tiger.gate3_conversation_id')::uuid
\gset
\if :monotonic_sequence
  \echo MONOTONIC_SEQUENCE=PASS
\else
  \echo MONOTONIC_SEQUENCE=FAIL
  \quit 1
\endif

select (count(*) = 1 and min(sequence) = 1) as idempotent_row_count
from public.vvip_social_messages
where conversation_id = current_setting('tiger.gate3_conversation_id')::uuid
  and sender_subject = 'user_alice'
  and client_message_id = '00000000-0000-4000-8000-000000000001'::uuid
\gset
\if :idempotent_row_count
  \echo IDEMPOTENT_DURABLE_ROW=PASS
\else
  \echo IDEMPOTENT_DURABLE_ROW=FAIL
  \quit 1
\endif

-- Keyset catch-up returns only the durable tail after the supplied sequence.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_bob"}', true);
select (
    count(*) = 1
    and min(sequence) = 2
    and max(sequence) = 2
) as keyset_catchup
from public.vvip_social_list_messages(
    current_setting('tiger.gate3_conversation_id')::uuid,
    1,
    50
)
\gset
\if :keyset_catchup
  \echo KEYSET_CATCHUP=PASS
\else
  \echo KEYSET_CATCHUP=FAIL
  \quit 1
\endif

-- Read cursors advance only forward and never beyond the durable tail.
select ((public.vvip_social_mark_read(
    current_setting('tiger.gate3_conversation_id')::uuid,
    2
)->>'last_read_sequence')::bigint = 2) as read_advanced
\gset
\if :read_advanced
  \echo READ_CURSOR_ADVANCE=PASS
\else
  \echo READ_CURSOR_ADVANCE=FAIL
  \quit 1
\endif

select ((public.vvip_social_mark_read(
    current_setting('tiger.gate3_conversation_id')::uuid,
    1
)->>'last_read_sequence')::bigint = 2) as read_monotonic
\gset
\if :read_monotonic
  \echo READ_CURSOR_MONOTONIC=PASS
\else
  \echo READ_CURSOR_MONOTONIC=FAIL
  \quit 1
\endif

do $tail_bound$
declare
    v_denied boolean := false;
begin
    begin
        perform public.vvip_social_mark_read(
            current_setting('tiger.gate3_conversation_id')::uuid,
            3
        );
    exception
        when raise_exception then
            if sqlerrm = 'SOCIAL_READ_CURSOR_BEYOND_TAIL' then
                v_denied := true;
            else
                raise;
            end if;
    end;
    if not v_denied then
        raise exception 'READ_CURSOR_BEYOND_TAIL_WAS_NOT_DENIED';
    end if;
end;
$tail_bound$;
\echo READ_CURSOR_TAIL_BOUND=PASS
reset role;

-- Capture the pre-block private topic. The block transaction must advance its epoch.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_alice"}', true);
select set_config(
    'tiger.gate3_old_topic',
    (public.vvip_social_get_channel_ticket(
        current_setting('tiger.gate3_conversation_id')::uuid
    )->>'topic'),
    true
);
select set_config(
    'tiger.gate3_old_epoch',
    (public.vvip_social_get_channel_ticket(
        current_setting('tiger.gate3_conversation_id')::uuid
    )->>'channel_epoch'),
    true
);
select public.vvip_social_block_user('user_bob');

do $blocked_boundary$
declare
    v_conversation_id uuid := current_setting('tiger.gate3_conversation_id')::uuid;
    v_denied integer := 0;
begin
    begin
        perform public.vvip_social_send_message(
            v_conversation_id,
            '00000000-0000-4000-8000-000000000004'::uuid,
            'blocked-send'
        );
    exception
        when raise_exception then
            if sqlerrm = 'SOCIAL_BLOCK_ACTIVE' then
                v_denied := v_denied + 1;
            else
                raise;
            end if;
    end;

    begin
        perform public.vvip_social_get_channel_ticket(v_conversation_id);
    exception
        when raise_exception then
            if sqlerrm = 'SOCIAL_BLOCK_ACTIVE' then
                v_denied := v_denied + 1;
            else
                raise;
            end if;
    end;

    if v_denied <> 2 then
        raise exception 'BLOCKED_SEND_TICKET_BOUNDARY_INCOMPLETE:%', v_denied;
    end if;
end;
$blocked_boundary$;
\echo BLOCK_SEND_TICKET_DENIED=PASS

select (not public.vvip_social_realtime_topic_authorized(
    current_setting('tiger.gate3_old_topic'),
    'broadcast'
)) as old_epoch_denied_while_blocked
\gset
\if :old_epoch_denied_while_blocked
  \echo OLD_EPOCH_DENIED=PASS
\else
  \echo OLD_EPOCH_DENIED=FAIL
  \quit 1
\endif

-- Historical durable reading remains available after a block.
select (count(*) = 2) as blocked_history_readable
from public.vvip_social_list_messages(
    current_setting('tiger.gate3_conversation_id')::uuid,
    0,
    50
)
\gset
\if :blocked_history_readable
  \echo BLOCKED_HISTORY_READABLE=PASS
\else
  \echo BLOCKED_HISTORY_READABLE=FAIL
  \quit 1
\endif

-- Unblocking never resurrects friendship, but the existing conversation gets a fresh epoch.
select public.vvip_social_unblock_user('user_bob');
select (
    channel_epoch = current_setting('tiger.gate3_old_epoch')::bigint + 2
    and membership_version = current_setting('tiger.gate3_old_epoch')::bigint + 2
) as unblock_epoch_advanced
from public.vvip_social_conversations
where conversation_id = current_setting('tiger.gate3_conversation_id')::uuid
\gset
\if :unblock_epoch_advanced
  \echo UNBLOCK_EPOCH_ADVANCED=PASS
\else
  \echo UNBLOCK_EPOCH_ADVANCED=FAIL
  \quit 1
\endif

select set_config(
    'tiger.gate3_current_topic',
    (public.vvip_social_get_channel_ticket(
        current_setting('tiger.gate3_conversation_id')::uuid
    )->>'topic'),
    true
);
select (
    public.vvip_social_realtime_topic_authorized(
        current_setting('tiger.gate3_current_topic'),
        'broadcast'
    )
    and public.vvip_social_realtime_topic_authorized(
        current_setting('tiger.gate3_current_topic'),
        'presence'
    )
    and not public.vvip_social_realtime_topic_authorized(
        current_setting('tiger.gate3_current_topic'),
        'postgres_changes'
    )
    and not public.vvip_social_realtime_topic_authorized(
        current_setting('tiger.gate3_old_topic'),
        'broadcast'
    )
) as current_epoch_authorized
\gset
\if :current_epoch_authorized
  \echo CURRENT_EPOCH_AUTHORIZED=PASS
\else
  \echo CURRENT_EPOCH_AUTHORIZED=FAIL
  \quit 1
\endif
reset role;

-- Inspect the exact Gate 3 Realtime policy surface: receive Broadcast/Presence,
-- client INSERT Presence only, never authenticated client Broadcast INSERT.
select (
    exists (
        select 1
        from pg_policies
        where schemaname = 'realtime'
          and tablename = 'messages'
          and policyname = 'vvip_social_realtime_receive_current_epoch'
          and cmd = 'SELECT'
          and roles::text like '%authenticated%'
          and qual ilike '%broadcast%'
          and qual ilike '%presence%'
    )
    and exists (
        select 1
        from pg_policies
        where schemaname = 'realtime'
          and tablename = 'messages'
          and policyname = 'vvip_social_realtime_presence_current_epoch'
          and cmd = 'INSERT'
          and roles::text like '%authenticated%'
          and with_check ilike '%presence%'
          and with_check not ilike '%broadcast%'
    )
    and not exists (
        select 1
        from pg_policies
        where schemaname = 'realtime'
          and tablename = 'messages'
          and policyname like 'vvip_social_realtime%'
          and cmd = 'INSERT'
          and coalesce(with_check, '') ilike '%broadcast%'
    )
) as realtime_presence_only
\gset
\if :realtime_presence_only
  \echo REALTIME_PRESENCE_ONLY=PASS
\else
  \echo REALTIME_PRESENCE_ONLY=FAIL
  \quit 1
\endif

rollback;
\echo TIGER_GATE3_DB_REHEARSAL=PASS
