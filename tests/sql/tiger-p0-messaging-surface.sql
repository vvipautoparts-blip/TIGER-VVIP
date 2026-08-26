\set ON_ERROR_STOP on

begin;

reset role;
select (
  has_function_privilege('authenticated', 'public.vvip_social_list_conversations(integer)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.vvip_social_list_message_contacts(integer)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.vvip_social_list_conversations(integer)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.vvip_social_list_message_contacts(integer)', 'EXECUTE')
) as messaging_surface_rpc_boundary
\gset
\if :messaging_surface_rpc_boundary
  \echo P0_MESSAGING_SURFACE_RPC_BOUNDARY=PASS
\else
  \echo P0_MESSAGING_SURFACE_RPC_BOUNDARY=FAIL
  \quit 1
\endif

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_surfacealice01"}', true);
select public.vvip_upsert_my_social_profile(
  'Surface Alice', null, null, 'Amman', 'Social', 'Messaging surface proof'
) as alice_profile
\gset
select (:'alice_profile'::jsonb->'profile'->>'profile_id') as alice_profile_id
\gset

select set_config('request.jwt.claims', '{"sub":"user_surfacebob001"}', true);
select public.vvip_upsert_my_social_profile(
  'Surface Bob', null, null, 'Amman', 'Social', 'Messaging surface proof'
) as bob_profile
\gset
select (:'bob_profile'::jsonb->'profile'->>'profile_id') as bob_profile_id
\gset

reset role;
insert into public.vvip_social_relationships (
  requester_subject,
  addressee_subject,
  relationship_state
) values (
  'user_surfacealice01',
  'user_surfacebob001',
  'friends'
);

insert into public.vvip_social_conversations (
  subject_low,
  subject_high
) values (
  'user_surfacebob001',
  'user_surfacecharlie01'
)
returning conversation_id as malformed_membership_conversation_id
\gset
insert into public.vvip_social_conversation_members (
  conversation_id,
  member_subject
) values (
  :'malformed_membership_conversation_id'::uuid,
  'user_surfacealice01'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_surfacealice01"}', true);
select count(*) = 0 as malformed_membership_hidden
from public.vvip_social_list_conversations(20) as conversation_row
where conversation_row.conversation_id = :'malformed_membership_conversation_id'::uuid
\gset
\if :malformed_membership_hidden
  \echo P0_MESSAGING_SURFACE_MALFORMED_MEMBERSHIP_HIDDEN=PASS
\else
  \echo P0_MESSAGING_SURFACE_MALFORMED_MEMBERSHIP_HIDDEN=FAIL
  \quit 1
\endif

select coalesce(jsonb_agg(to_jsonb(contact_row)), '[]'::jsonb) as alice_contacts
from public.vvip_social_list_message_contacts(50) as contact_row
\gset
select (
  jsonb_array_length(:'alice_contacts'::jsonb) = 1
  and :'alice_contacts'::jsonb->0->>'peer_profile_id' = :'bob_profile_id'
  and :'alice_contacts'::jsonb->0->>'peer_display_name' = 'Surface Bob'
  and position('user_surfacealice01' in :'alice_contacts') = 0
  and position('user_surfacebob001' in :'alice_contacts') = 0
  and not (:'alice_contacts'::jsonb->0 ? 'subject')
) as messaging_contact_discovery_safe
\gset
\if :messaging_contact_discovery_safe
  \echo P0_MESSAGING_CONTACT_DISCOVERY_SAFE=PASS
\else
  \echo P0_MESSAGING_CONTACT_DISCOVERY_SAFE=FAIL
  \quit 1
\endif

select public.vvip_social_open_direct_conversation(
  :'bob_profile_id'::uuid,
  'surface-open'
) as conversation_open
\gset
select (:'conversation_open'::jsonb->>'conversation_id') as conversation_id
\gset

select public.vvip_social_send_message(
  :'conversation_id'::uuid,
  '51111111-1111-4111-8111-111111111111'::uuid,
  'رسالة من Alice'
);

select set_config('request.jwt.claims', '{"sub":"user_surfacebob001"}', true);
select public.vvip_social_send_message(
  :'conversation_id'::uuid,
  '52222222-2222-4222-8222-222222222222'::uuid,
  'رسالة من Bob'
);

select set_config('request.jwt.claims', '{"sub":"user_surfacealice01"}', true);
select coalesce(jsonb_agg(to_jsonb(conversation_row)), '[]'::jsonb) as alice_conversations
from public.vvip_social_list_conversations(20) as conversation_row
\gset
select (
  jsonb_array_length(:'alice_conversations'::jsonb) = 1
  and :'alice_conversations'::jsonb->0->>'conversation_id' = :'conversation_id'
  and :'alice_conversations'::jsonb->0->>'peer_profile_id' = :'bob_profile_id'
  and :'alice_conversations'::jsonb->0->>'peer_display_name' = 'Surface Bob'
  and (:'alice_conversations'::jsonb->0->>'peer_available')::boolean
  and (:'alice_conversations'::jsonb->0->>'can_message')::boolean
  and (:'alice_conversations'::jsonb->0->>'last_message_sequence')::bigint = 2
  and (:'alice_conversations'::jsonb->0->>'last_read_sequence')::bigint = 0
  and (:'alice_conversations'::jsonb->0->>'unread_count')::bigint = 1
  and :'alice_conversations'::jsonb->0->>'last_message_body' = 'رسالة من Bob'
  and not (:'alice_conversations'::jsonb->0->>'last_message_viewer_is_sender')::boolean
  and position('user_surfacealice01' in :'alice_conversations') = 0
  and position('user_surfacebob001' in :'alice_conversations') = 0
  and not (:'alice_conversations'::jsonb->0 ? 'subject')
) as messaging_conversation_discovery_safe
\gset
\if :messaging_conversation_discovery_safe
  \echo P0_MESSAGING_CONVERSATION_DISCOVERY_SAFE=PASS
\else
  \echo P0_MESSAGING_CONVERSATION_DISCOVERY_SAFE=FAIL
  \quit 1
\endif

select public.vvip_social_mark_read(:'conversation_id'::uuid, 2);
select (conversation_row.unread_count = 0 and conversation_row.last_read_sequence = 2) as read_state_converged
from public.vvip_social_list_conversations(20) as conversation_row
where conversation_row.conversation_id = :'conversation_id'::uuid
\gset
\if :read_state_converged
  \echo P0_MESSAGING_SURFACE_READ_STATE=PASS
\else
  \echo P0_MESSAGING_SURFACE_READ_STATE=FAIL
  \quit 1
\endif

select public.vvip_social_block_profile(:'bob_profile_id'::uuid);
select (
  not conversation_row.can_message
  and conversation_row.peer_available
) as blocked_conversation_safe
from public.vvip_social_list_conversations(20) as conversation_row
where conversation_row.conversation_id = :'conversation_id'::uuid
\gset
select count(*) = 0 as blocked_contact_hidden
from public.vvip_social_list_message_contacts(50) as contact_row
where contact_row.peer_profile_id = :'bob_profile_id'::uuid
\gset
\if :blocked_conversation_safe
  \if :blocked_contact_hidden
    \echo P0_MESSAGING_SURFACE_BLOCK_STATE=PASS
  \else
    \echo P0_MESSAGING_SURFACE_BLOCK_STATE=FAIL
    \quit 1
  \endif
\else
  \echo P0_MESSAGING_SURFACE_BLOCK_STATE=FAIL
  \quit 1
\endif

select public.vvip_social_unblock_profile(:'bob_profile_id'::uuid);
select set_config('request.jwt.claims', '{"sub":"user_surfacebob001"}', true);
select public.vvip_deactivate_my_social_profile();

select set_config('request.jwt.claims', '{"sub":"user_surfacealice01"}', true);
select (
  not conversation_row.peer_available
  and not conversation_row.can_message
  and conversation_row.peer_profile_id is null
  and conversation_row.peer_display_name = 'عضو غير متاح'
  and conversation_row.peer_avatar_url is null
) as inactive_peer_tombstone
from public.vvip_social_list_conversations(20) as conversation_row
where conversation_row.conversation_id = :'conversation_id'::uuid
\gset
\if :inactive_peer_tombstone
  \echo P0_MESSAGING_SURFACE_INACTIVE_TOMBSTONE=PASS
\else
  \echo P0_MESSAGING_SURFACE_INACTIVE_TOMBSTONE=FAIL
  \quit 1
\endif

\echo TIGER_P0_MESSAGING_SURFACE_DB_BEHAVIOR=PASS

rollback;
