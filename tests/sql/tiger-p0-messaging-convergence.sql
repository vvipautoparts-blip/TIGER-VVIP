\set ON_ERROR_STOP on

begin;

reset role;
select (
  not has_table_privilege('authenticated', 'public.vvip_social_blocks', 'SELECT')
  and not has_table_privilege('authenticated', 'public.vvip_social_blocks', 'INSERT')
  and not has_table_privilege('authenticated', 'public.vvip_social_blocks', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.vvip_social_blocks', 'DELETE')
  and not has_table_privilege('authenticated', 'public.vvip_social_conversations', 'SELECT')
  and not has_table_privilege('authenticated', 'public.vvip_social_conversation_members', 'SELECT')
  and not has_table_privilege('authenticated', 'public.vvip_social_messages', 'SELECT')
  and not has_table_privilege('authenticated', 'public.vvip_social_messages', 'INSERT')
  and not has_table_privilege('authenticated', 'public.vvip_social_messages', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.vvip_social_messages', 'DELETE')
  and not has_table_privilege('authenticated', 'public.vvip_social_read_cursors', 'SELECT')
  and has_function_privilege('authenticated', 'public.vvip_social_block_profile(uuid)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.vvip_social_unblock_profile(uuid)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.vvip_social_open_direct_conversation(uuid,text)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.vvip_social_send_message(uuid,uuid,text)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.vvip_social_list_messages(uuid,bigint,integer)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.vvip_social_mark_read(uuid,bigint)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.vvip_social_get_channel_ticket(uuid)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.vvip_social_send_message(uuid,uuid,text)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.vvip_social_list_messages(uuid,bigint,integer)', 'EXECUTE')
) as messaging_rpc_only_boundary
\gset
\if :messaging_rpc_only_boundary
  \echo P0_MESSAGING_RPC_ONLY_BOUNDARY=PASS
\else
  \echo P0_MESSAGING_RPC_ONLY_BOUNDARY=FAIL
  \quit 1
\endif

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_msgalice01"}', true);
select public.vvip_upsert_my_social_profile(
  'Messaging Alice',
  'https://example.invalid/messaging-alice.png',
  null,
  'Amman',
  'Automotive',
  'P0 messaging Alice proof'
) as alice_profile
\gset
select (:'alice_profile'::jsonb->'profile'->>'profile_id') as alice_profile_id
\gset

select set_config('request.jwt.claims', '{"sub":"user_msgbob001"}', true);
select public.vvip_upsert_my_social_profile(
  'Messaging Bob',
  'https://example.invalid/messaging-bob.png',
  null,
  'Amman',
  'Automotive',
  'P0 messaging Bob proof'
) as bob_profile
\gset
select (:'bob_profile'::jsonb->'profile'->>'profile_id') as bob_profile_id
\gset

select set_config('request.jwt.claims', '{"sub":"user_msgalice01"}', true);
insert into public.vvip_social_relationships (
  addressee_subject,
  relationship_state
) values (
  'user_msgbob001',
  'pending'
)
returning relationship_id as friendship_id
\gset

select set_config('request.jwt.claims', '{"sub":"user_msgbob001"}', true);
update public.vvip_social_relationships
set relationship_state = 'friends'
where relationship_id = :'friendship_id'::uuid;
select count(*) = 1 as friendship_accepted
from public.vvip_social_relationships
where relationship_id = :'friendship_id'::uuid
  and relationship_state = 'friends'
\gset
\if :friendship_accepted
  \echo P0_MESSAGING_FRIENDSHIP_AUTHORITY=PASS
\else
  \echo P0_MESSAGING_FRIENDSHIP_AUTHORITY=FAIL
  \quit 1
\endif

select set_config('request.jwt.claims', '{"sub":"user_msgalice01"}', true);
select public.vvip_social_open_direct_conversation(
  :'bob_profile_id'::uuid,
  'p0-messaging-proof-open'
) as conversation_open
\gset
select (:'conversation_open'::jsonb->>'conversation_id') as conversation_id,
       (:'conversation_open'::jsonb->>'channel_epoch')::bigint as initial_channel_epoch
\gset
select set_config('tiger.messaging.conversation_id', :'conversation_id', true);

select public.vvip_social_open_direct_conversation(
  :'bob_profile_id'::uuid,
  'p0-messaging-proof-open-replay'
) as conversation_reopen
\gset
select (
  :'conversation_reopen'::jsonb->>'conversation_id' = :'conversation_id'
  and position('user_msgalice01' in :'conversation_open') = 0
  and position('user_msgbob001' in :'conversation_open') = 0
  and not (:'conversation_open'::jsonb ? 'subject')
) as conversation_identity_safe
\gset
\if :conversation_identity_safe
  \echo P0_MESSAGING_CONVERSATION_IDENTITY_SAFE=PASS
\else
  \echo P0_MESSAGING_CONVERSATION_IDENTITY_SAFE=FAIL
  \quit 1
\endif

select public.vvip_social_send_message(
  :'conversation_id'::uuid,
  '11111111-1111-4111-8111-111111111111'::uuid,
  'hello from Alice'
) as alice_send_one
\gset
select public.vvip_social_send_message(
  :'conversation_id'::uuid,
  '11111111-1111-4111-8111-111111111111'::uuid,
  'hello from Alice'
) as alice_send_replay
\gset
select (
  :'alice_send_one'::jsonb->>'message_id' = :'alice_send_replay'::jsonb->>'message_id'
  and (:'alice_send_one'::jsonb->>'sequence')::bigint = 1
  and not (:'alice_send_one'::jsonb->>'idempotent_replay')::boolean
  and (:'alice_send_replay'::jsonb->>'idempotent_replay')::boolean
  and position('user_msgalice01' in :'alice_send_one') = 0
  and not (:'alice_send_one'::jsonb ? 'sender_subject')
) as messaging_idempotent_send
\gset
\if :messaging_idempotent_send
  \echo P0_MESSAGING_IDEMPOTENT_SEND=PASS
\else
  \echo P0_MESSAGING_IDEMPOTENT_SEND=FAIL
  \quit 1
\endif

select set_config('request.jwt.claims', '{"sub":"user_msgbob001"}', true);
select public.vvip_social_send_message(
  :'conversation_id'::uuid,
  '22222222-2222-4222-8222-222222222222'::uuid,
  'hello from Bob'
) as bob_send_two
\gset
select (
  (:'bob_send_two'::jsonb->>'sequence')::bigint = 2
  and :'bob_send_two'::jsonb->>'sender_profile_id' = :'bob_profile_id'
  and :'bob_send_two'::jsonb->>'sender_display_name' = 'Messaging Bob'
  and position('user_msgbob001' in :'bob_send_two') = 0
  and not (:'bob_send_two'::jsonb ? 'sender_subject')
) as messaging_monotonic_second_send
\gset
\if :messaging_monotonic_second_send
  \echo P0_MESSAGING_MONOTONIC_SEQUENCE=PASS
\else
  \echo P0_MESSAGING_MONOTONIC_SEQUENCE=FAIL
  \quit 1
\endif

select set_config('request.jwt.claims', '{"sub":"user_msgalice01"}', true);
select coalesce(jsonb_agg(to_jsonb(message_row) order by message_row.sequence), '[]'::jsonb) as active_message_rows
from public.vvip_social_list_messages(:'conversation_id'::uuid, 0, 50) as message_row
\gset
select (
  jsonb_array_length(:'active_message_rows'::jsonb) = 2
  and :'active_message_rows'::jsonb->1->>'sender_profile_id' = :'bob_profile_id'
  and :'active_message_rows'::jsonb->1->>'sender_display_name' = 'Messaging Bob'
  and (:'active_message_rows'::jsonb->1->>'sender_available')::boolean
  and position('user_msgalice01' in :'active_message_rows') = 0
  and position('user_msgbob001' in :'active_message_rows') = 0
  and not (:'active_message_rows'::jsonb->0 ? 'sender_subject')
  and not (:'active_message_rows'::jsonb->1 ? 'sender_subject')
) as messaging_active_read_safe
\gset
\if :messaging_active_read_safe
  \echo P0_MESSAGING_ACTIVE_READ_SAFE=PASS
\else
  \echo P0_MESSAGING_ACTIVE_READ_SAFE=FAIL
  \quit 1
\endif

select public.vvip_social_mark_read(:'conversation_id'::uuid, 2) as read_two
\gset
select public.vvip_social_mark_read(:'conversation_id'::uuid, 1) as read_regression_attempt
\gset
select (
  (:'read_two'::jsonb->>'last_read_sequence')::bigint = 2
  and (:'read_regression_attempt'::jsonb->>'last_read_sequence')::bigint = 2
  and not (:'read_regression_attempt'::jsonb->>'advanced')::boolean
  and position('user_msgalice01' in :'read_two') = 0
  and position('user_msgbob001' in :'read_two') = 0
) as messaging_monotonic_read_cursor
\gset
\if :messaging_monotonic_read_cursor
  \echo P0_MESSAGING_MONOTONIC_READ_CURSOR=PASS
\else
  \echo P0_MESSAGING_MONOTONIC_READ_CURSOR=FAIL
  \quit 1
\endif

select public.vvip_social_get_channel_ticket(:'conversation_id'::uuid) as initial_ticket
\gset
select (
  (:'initial_ticket'::jsonb->>'channel_epoch')::bigint = :initial_channel_epoch
  and public.vvip_social_realtime_topic_authorized(
    :'initial_ticket'::jsonb->>'topic',
    'broadcast'
  )
) as messaging_initial_epoch_authorized
\gset
\if :messaging_initial_epoch_authorized
  \echo P0_MESSAGING_INITIAL_EPOCH_AUTHORIZED=PASS
\else
  \echo P0_MESSAGING_INITIAL_EPOCH_AUTHORIZED=FAIL
  \quit 1
\endif

select public.vvip_social_block_profile(:'bob_profile_id'::uuid) as block_bob
\gset
select (
  (:'block_bob'::jsonb->>'blocked')::boolean
  and (:'block_bob'::jsonb->>'changed')::boolean
  and not public.vvip_social_realtime_topic_authorized(
    :'initial_ticket'::jsonb->>'topic',
    'broadcast'
  )
) as messaging_block_epoch_fenced
\gset
\if :messaging_block_epoch_fenced
  \echo P0_MESSAGING_BLOCK_EPOCH_FENCED=PASS
\else
  \echo P0_MESSAGING_BLOCK_EPOCH_FENCED=FAIL
  \quit 1
\endif

do $proof$
begin
  begin
    perform public.vvip_social_send_message(
      current_setting('tiger.messaging.conversation_id')::uuid,
      '33333333-3333-4333-8333-333333333333'::uuid,
      'blocked send must fail'
    );
    raise exception 'TEST_EXPECTED_BLOCKED_SEND_DENIAL';
  exception when others then
    if upper(sqlerrm) <> 'SOCIAL_BLOCK_ACTIVE' then raise; end if;
  end;

  begin
    perform public.vvip_social_get_channel_ticket(
      current_setting('tiger.messaging.conversation_id')::uuid
    );
    raise exception 'TEST_EXPECTED_BLOCKED_TICKET_DENIAL';
  exception when others then
    if upper(sqlerrm) <> 'SOCIAL_BLOCK_ACTIVE' then raise; end if;
  end;
end;
$proof$;
\echo P0_MESSAGING_BLOCK_SEND_AND_TICKET_DENIED=PASS

select count(*) = 2 as messaging_history_survives_block
from public.vvip_social_list_messages(:'conversation_id'::uuid, 0, 50)
\gset
\if :messaging_history_survives_block
  \echo P0_MESSAGING_HISTORY_SURVIVES_BLOCK=PASS
\else
  \echo P0_MESSAGING_HISTORY_SURVIVES_BLOCK=FAIL
  \quit 1
\endif

select public.vvip_social_unblock_profile(:'bob_profile_id'::uuid) as unblock_bob
\gset
select public.vvip_social_get_channel_ticket(:'conversation_id'::uuid) as post_unblock_ticket
\gset
select (
  not (:'unblock_bob'::jsonb->>'blocked')::boolean
  and (:'unblock_bob'::jsonb->>'changed')::boolean
  and (:'post_unblock_ticket'::jsonb->>'channel_epoch')::bigint = :initial_channel_epoch + 2
  and not public.vvip_social_realtime_topic_authorized(
    :'initial_ticket'::jsonb->>'topic',
    'broadcast'
  )
  and public.vvip_social_realtime_topic_authorized(
    :'post_unblock_ticket'::jsonb->>'topic',
    'broadcast'
  )
) as messaging_unblock_new_epoch
\gset
\if :messaging_unblock_new_epoch
  \echo P0_MESSAGING_UNBLOCK_NEW_EPOCH=PASS
\else
  \echo P0_MESSAGING_UNBLOCK_NEW_EPOCH=FAIL
  \quit 1
\endif

select set_config('request.jwt.claims', '{"sub":"user_msgalice01"}', true);
select count(*) = 0 as friendship_removed_by_block
from public.vvip_social_relationships
where subject_low = least('user_msgalice01', 'user_msgbob001')
  and subject_high = greatest('user_msgalice01', 'user_msgbob001')
\gset
\if :friendship_removed_by_block
  \echo P0_MESSAGING_BLOCK_REMOVES_FRIENDSHIP=PASS
\else
  \echo P0_MESSAGING_BLOCK_REMOVES_FRIENDSHIP=FAIL
  \quit 1
\endif

select public.vvip_social_send_message(
  :'conversation_id'::uuid,
  '44444444-4444-4444-8444-444444444444'::uuid,
  'existing conversation resumes after unblock'
) as alice_send_three
\gset
select (:'alice_send_three'::jsonb->>'sequence')::bigint = 3 as messaging_existing_conversation_resumes
\gset
\if :messaging_existing_conversation_resumes
  \echo P0_MESSAGING_EXISTING_CONVERSATION_RESUMES=PASS
\else
  \echo P0_MESSAGING_EXISTING_CONVERSATION_RESUMES=FAIL
  \quit 1
\endif

select set_config('request.jwt.claims', '{"sub":"user_msgbob001"}', true);
select public.vvip_deactivate_my_social_profile() as bob_deactivated
\gset
select (:'bob_deactivated'::jsonb->'profile'->>'profile_state' = 'deactivated') as bob_deactivated_ok
\gset
\if :bob_deactivated_ok
  \echo P0_MESSAGING_PEER_DEACTIVATED=PASS
\else
  \echo P0_MESSAGING_PEER_DEACTIVATED=FAIL
  \quit 1
\endif

select set_config('request.jwt.claims', '{"sub":"user_msgalice01"}', true);
select coalesce(jsonb_agg(to_jsonb(message_row) order by message_row.sequence), '[]'::jsonb) as deactivated_message_rows
from public.vvip_social_list_messages(:'conversation_id'::uuid, 0, 50) as message_row
\gset
select (
  jsonb_array_length(:'deactivated_message_rows'::jsonb) = 3
  and :'deactivated_message_rows'::jsonb->1->>'sender_profile_id' is null
  and :'deactivated_message_rows'::jsonb->1->>'sender_display_name' = 'عضو غير متاح'
  and :'deactivated_message_rows'::jsonb->1->>'sender_avatar_url' is null
  and not (:'deactivated_message_rows'::jsonb->1->>'sender_available')::boolean
  and :'deactivated_message_rows'::jsonb->1->>'body' = 'hello from Bob'
  and position('user_msgbob001' in :'deactivated_message_rows') = 0
) as messaging_deactivated_tombstone
\gset
\if :messaging_deactivated_tombstone
  \echo P0_MESSAGING_DEACTIVATED_TOMBSTONE=PASS
\else
  \echo P0_MESSAGING_DEACTIVATED_TOMBSTONE=FAIL
  \quit 1
\endif

do $proof$
begin
  begin
    perform public.vvip_social_send_message(
      current_setting('tiger.messaging.conversation_id')::uuid,
      '55555555-5555-4555-8555-555555555555'::uuid,
      'inactive peer send must fail'
    );
    raise exception 'TEST_EXPECTED_INACTIVE_PEER_SEND_DENIAL';
  exception when others then
    if upper(sqlerrm) <> 'SOCIAL_MESSAGE_PEER_NOT_AVAILABLE' then raise; end if;
  end;

  begin
    perform public.vvip_social_get_channel_ticket(
      current_setting('tiger.messaging.conversation_id')::uuid
    );
    raise exception 'TEST_EXPECTED_INACTIVE_PEER_TICKET_DENIAL';
  exception when others then
    if upper(sqlerrm) <> 'SOCIAL_MESSAGE_PEER_NOT_AVAILABLE' then raise; end if;
  end;
end;
$proof$;
\echo P0_MESSAGING_INACTIVE_PEER_SEND_AND_TICKET_DENIED=PASS

select set_config('request.jwt.claims', '{"sub":"user_msgbob001"}', true);
do $proof$
begin
  begin
    perform public.vvip_social_list_messages(
      current_setting('tiger.messaging.conversation_id')::uuid,
      0,
      50
    );
    raise exception 'TEST_EXPECTED_INACTIVE_ACTOR_READ_DENIAL';
  exception when others then
    if upper(sqlerrm) <> 'SOCIAL_PROFILE_INACTIVE' then raise; end if;
  end;
end;
$proof$;
\echo P0_MESSAGING_INACTIVE_ACTOR_DENIED=PASS

select public.vvip_reactivate_my_social_profile() as bob_reactivated
\gset
select (:'bob_reactivated'::jsonb->'profile'->>'profile_state' = 'active') as bob_reactivated_ok
\gset
\if :bob_reactivated_ok
  \echo P0_MESSAGING_PEER_REACTIVATED=PASS
\else
  \echo P0_MESSAGING_PEER_REACTIVATED=FAIL
  \quit 1
\endif

select set_config('request.jwt.claims', '{"sub":"user_msgalice01"}', true);
select public.vvip_social_send_message(
  :'conversation_id'::uuid,
  '66666666-6666-4666-8666-666666666666'::uuid,
  'reactivated peer resumes safely'
) as alice_send_four
\gset
select (
  (:'alice_send_four'::jsonb->>'sequence')::bigint = 4
  and position('user_msgbob001' in :'alice_send_four') = 0
) as messaging_reactivation_resumes
\gset
\if :messaging_reactivation_resumes
  \echo P0_MESSAGING_REACTIVATION_RESUMES=PASS
\else
  \echo P0_MESSAGING_REACTIVATION_RESUMES=FAIL
  \quit 1
\endif

reset role;
set local role service_role;
select public.vvip_mark_social_profile_deleted('user_msgbob001') as bob_deleted
\gset
select (:'bob_deleted'::jsonb->'profile'->>'profile_state' = 'deleted') as bob_deleted_ok
\gset
\if :bob_deleted_ok
  \echo P0_MESSAGING_PEER_DELETED=PASS
\else
  \echo P0_MESSAGING_PEER_DELETED=FAIL
  \quit 1
\endif

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_msgalice01"}', true);
select coalesce(jsonb_agg(to_jsonb(message_row) order by message_row.sequence), '[]'::jsonb) as deleted_message_rows
from public.vvip_social_list_messages(:'conversation_id'::uuid, 0, 50) as message_row
\gset
select (
  jsonb_array_length(:'deleted_message_rows'::jsonb) = 4
  and :'deleted_message_rows'::jsonb->1->>'sender_profile_id' is null
  and :'deleted_message_rows'::jsonb->1->>'sender_display_name' = 'عضو غير متاح'
  and not (:'deleted_message_rows'::jsonb->1->>'sender_available')::boolean
  and :'deleted_message_rows'::jsonb->1->>'body' = 'hello from Bob'
  and position('user_msgbob001' in :'deleted_message_rows') = 0
) as messaging_deleted_tombstone
\gset
\if :messaging_deleted_tombstone
  \echo P0_MESSAGING_DELETED_TOMBSTONE=PASS
\else
  \echo P0_MESSAGING_DELETED_TOMBSTONE=FAIL
  \quit 1
\endif

do $proof$
begin
  begin
    perform public.vvip_social_send_message(
      current_setting('tiger.messaging.conversation_id')::uuid,
      '77777777-7777-4777-8777-777777777777'::uuid,
      'deleted peer send must fail'
    );
    raise exception 'TEST_EXPECTED_DELETED_PEER_SEND_DENIAL';
  exception when others then
    if upper(sqlerrm) <> 'SOCIAL_MESSAGE_PEER_NOT_AVAILABLE' then raise; end if;
  end;

  begin
    perform public.vvip_social_get_channel_ticket(
      current_setting('tiger.messaging.conversation_id')::uuid
    );
    raise exception 'TEST_EXPECTED_DELETED_PEER_TICKET_DENIAL';
  exception when others then
    if upper(sqlerrm) <> 'SOCIAL_MESSAGE_PEER_NOT_AVAILABLE' then raise; end if;
  end;
end;
$proof$;
\echo P0_MESSAGING_DELETED_PEER_SEND_AND_TICKET_DENIED=PASS

rollback;
\echo TIGER_P0_MESSAGING_CONVERGENCE_DB_BEHAVIOR=PASS
