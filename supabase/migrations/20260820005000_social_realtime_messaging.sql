-- TIGER Gate 3 — Sovereign Realtime Messaging 2026.
-- Repository/local rehearsal only. Production application remains a separate protected gate.
-- Durable truth is PostgreSQL. Supabase Realtime is private transport only.
-- Browser Broadcast INSERT is intentionally forbidden; durable events are database-originated.

begin;

create table public.vvip_social_conversations (
    conversation_id uuid primary key default gen_random_uuid(),
    conversation_kind text not null default 'direct'
        check (conversation_kind = 'direct'),
    subject_low text not null,
    subject_high text not null,
    channel_epoch bigint not null default 1
        check (channel_epoch > 0),
    membership_version bigint not null default 1
        check (membership_version > 0),
    next_sequence bigint not null default 1
        check (next_sequence > 0),
    last_message_sequence bigint not null default 0
        check (last_message_sequence >= 0),
    last_message_at timestamptz,
    created_at timestamptz not null default statement_timestamp(),
    updated_at timestamptz not null default statement_timestamp(),
    check (public.vvip_social_subject_is_valid(subject_low)),
    check (public.vvip_social_subject_is_valid(subject_high)),
    check (subject_low < subject_high),
    check (last_message_sequence < next_sequence),
    unique (subject_low, subject_high)
);

create table public.vvip_social_conversation_members (
    conversation_id uuid not null
        references public.vvip_social_conversations(conversation_id) on delete restrict,
    member_subject text not null,
    membership_state text not null default 'active'
        check (membership_state = 'active'),
    joined_version bigint not null default 1
        check (joined_version > 0),
    joined_at timestamptz not null default statement_timestamp(),
    primary key (conversation_id, member_subject),
    check (public.vvip_social_subject_is_valid(member_subject))
);

create table public.vvip_social_messages (
    message_id uuid primary key default gen_random_uuid(),
    conversation_id uuid not null
        references public.vvip_social_conversations(conversation_id) on delete restrict,
    sequence bigint not null
        check (sequence > 0),
    sender_subject text not null,
    client_message_id uuid not null,
    body text not null,
    created_at timestamptz not null default statement_timestamp(),
    check (public.vvip_social_subject_is_valid(sender_subject)),
    check (char_length(body) between 1 and 5000),
    unique (conversation_id, sequence),
    unique (conversation_id, sender_subject, client_message_id)
);

create table public.vvip_social_read_cursors (
    conversation_id uuid not null
        references public.vvip_social_conversations(conversation_id) on delete restrict,
    member_subject text not null,
    last_read_sequence bigint not null default 0
        check (last_read_sequence >= 0),
    updated_at timestamptz not null default statement_timestamp(),
    primary key (conversation_id, member_subject),
    check (public.vvip_social_subject_is_valid(member_subject))
);

create index vvip_social_conversation_members_member_idx
    on public.vvip_social_conversation_members (member_subject, conversation_id);
create index vvip_social_messages_conversation_created_idx
    on public.vvip_social_messages (conversation_id, created_at, sequence);
create index vvip_social_read_cursors_member_idx
    on public.vvip_social_read_cursors (member_subject, conversation_id);

alter table public.vvip_social_conversations enable row level security;
alter table public.vvip_social_conversations force row level security;
alter table public.vvip_social_conversation_members enable row level security;
alter table public.vvip_social_conversation_members force row level security;
alter table public.vvip_social_messages enable row level security;
alter table public.vvip_social_messages force row level security;
alter table public.vvip_social_read_cursors enable row level security;
alter table public.vvip_social_read_cursors force row level security;

revoke all privileges on table public.vvip_social_conversations from public, anon, authenticated;
revoke all privileges on table public.vvip_social_conversation_members from public, anon, authenticated;
revoke all privileges on table public.vvip_social_messages from public, anon, authenticated;
revoke all privileges on table public.vvip_social_read_cursors from public, anon, authenticated;

grant select, insert, update on table public.vvip_social_conversations to service_role;
grant select, insert on table public.vvip_social_conversation_members to service_role;
grant select, insert on table public.vvip_social_messages to service_role;
grant select, insert, update on table public.vvip_social_read_cursors to service_role;

create or replace function public.vvip_social_open_direct_conversation(
    peer_subject text,
    idempotency_key text
)
returns jsonb
language plpgsql
security definer set search_path = pg_catalog, public
as $function$
declare
    v_actor text := public.vvip_marketplace_actor_id();
    v_subject_low text;
    v_subject_high text;
    v_conversation public.vvip_social_conversations%rowtype;
begin
    if v_actor is null or not public.vvip_social_subject_is_valid(v_actor) then
        raise exception 'SOCIAL_AUTH_REQUIRED';
    end if;
    if peer_subject is null or not public.vvip_social_subject_is_valid(peer_subject) then
        raise exception 'SOCIAL_MESSAGE_PEER_INVALID';
    end if;
    if peer_subject = v_actor then
        raise exception 'SOCIAL_MESSAGE_SELF_CONVERSATION_DENIED';
    end if;
    if idempotency_key is null
       or char_length(btrim(idempotency_key)) = 0
       or char_length(idempotency_key) > 128 then
        raise exception 'SOCIAL_MESSAGE_IDEMPOTENCY_KEY_INVALID';
    end if;
    if public.vvip_social_is_blocked_pair(v_actor, peer_subject) then
        raise exception 'SOCIAL_BLOCK_ACTIVE';
    end if;

    v_subject_low := least(v_actor, peer_subject);
    v_subject_high := greatest(v_actor, peer_subject);

    if not exists (
        select 1
        from public.vvip_social_relationships relationship
        where relationship.subject_low = v_subject_low
          and relationship.subject_high = v_subject_high
          and relationship.relationship_state = 'friends'
    ) then
        raise exception 'SOCIAL_MESSAGE_FRIENDSHIP_REQUIRED';
    end if;

    insert into public.vvip_social_conversations (
        subject_low,
        subject_high
    ) values (
        v_subject_low,
        v_subject_high
    )
    on conflict (subject_low, subject_high) do nothing;

    select conversation.*
      into v_conversation
      from public.vvip_social_conversations conversation
     where conversation.subject_low = v_subject_low
       and conversation.subject_high = v_subject_high
     for update;

    insert into public.vvip_social_conversation_members (
        conversation_id,
        member_subject,
        joined_version
    ) values
        (v_conversation.conversation_id, v_subject_low, v_conversation.membership_version),
        (v_conversation.conversation_id, v_subject_high, v_conversation.membership_version)
    on conflict (conversation_id, member_subject) do nothing;

    insert into public.vvip_social_read_cursors (
        conversation_id,
        member_subject
    ) values
        (v_conversation.conversation_id, v_subject_low),
        (v_conversation.conversation_id, v_subject_high)
    on conflict (conversation_id, member_subject) do nothing;

    return jsonb_build_object(
        'conversation_id', v_conversation.conversation_id,
        'channel_epoch', v_conversation.channel_epoch,
        'membership_version', v_conversation.membership_version
    );
end;
$function$;

create or replace function public.vvip_social_send_message(
    conversation_id uuid,
    client_message_id uuid,
    body text
)
returns jsonb
language plpgsql
security definer set search_path = pg_catalog, public
as $function$
declare
    v_actor text := public.vvip_marketplace_actor_id();
    v_conversation public.vvip_social_conversations%rowtype;
    v_existing public.vvip_social_messages%rowtype;
    v_message public.vvip_social_messages%rowtype;
    v_body text;
    v_sequence bigint;
    v_topic text;
begin
    if v_actor is null or not public.vvip_social_subject_is_valid(v_actor) then
        raise exception 'SOCIAL_AUTH_REQUIRED';
    end if;
    if conversation_id is null or client_message_id is null then
        raise exception 'SOCIAL_MESSAGE_ID_INVALID';
    end if;

    v_body := btrim(coalesce(body, ''));
    if v_body = '' or char_length(v_body) > 5000 then
        raise exception 'SOCIAL_MESSAGE_BODY_INVALID';
    end if;

    select message.*
      into v_existing
      from public.vvip_social_messages message
     where message.conversation_id = vvip_social_send_message.conversation_id
       and message.sender_subject = v_actor
       and message.client_message_id = vvip_social_send_message.client_message_id;

    if found then
        return jsonb_build_object(
            'message_id', v_existing.message_id,
            'conversation_id', v_existing.conversation_id,
            'sequence', v_existing.sequence,
            'created_at', v_existing.created_at,
            'idempotent_replay', true
        );
    end if;

    select conversation.*
      into v_conversation
      from public.vvip_social_conversations conversation
     where conversation.conversation_id = vvip_social_send_message.conversation_id
     for update;

    if not found then
        raise exception 'SOCIAL_CONVERSATION_NOT_FOUND';
    end if;

    if not exists (
        select 1
        from public.vvip_social_conversation_members member
        where member.conversation_id = v_conversation.conversation_id
          and member.member_subject = v_actor
          and member.membership_state = 'active'
    ) then
        raise exception 'SOCIAL_CONVERSATION_MEMBER_REQUIRED';
    end if;

    if public.vvip_social_is_blocked_pair(v_conversation.subject_low, v_conversation.subject_high) then
        raise exception 'SOCIAL_BLOCK_ACTIVE';
    end if;

    -- Re-check after the conversation row lock so concurrent retries with the same
    -- client_message_id collapse to the same immutable durable message.
    select message.*
      into v_existing
      from public.vvip_social_messages message
     where message.conversation_id = v_conversation.conversation_id
       and message.sender_subject = v_actor
       and message.client_message_id = vvip_social_send_message.client_message_id;

    if found then
        return jsonb_build_object(
            'message_id', v_existing.message_id,
            'conversation_id', v_existing.conversation_id,
            'sequence', v_existing.sequence,
            'created_at', v_existing.created_at,
            'channel_epoch', v_conversation.channel_epoch,
            'idempotent_replay', true
        );
    end if;

    v_sequence := v_conversation.next_sequence;

    insert into public.vvip_social_messages (
        conversation_id,
        sequence,
        sender_subject,
        client_message_id,
        body
    ) values (
        v_conversation.conversation_id,
        v_sequence,
        v_actor,
        vvip_social_send_message.client_message_id,
        v_body
    )
    returning * into v_message;

    update public.vvip_social_conversations conversation
       set next_sequence = v_sequence + 1,
           last_message_sequence = v_sequence,
           last_message_at = v_message.created_at,
           updated_at = statement_timestamp()
     where conversation.conversation_id = v_conversation.conversation_id;

    v_topic := 'conversation:' || v_conversation.conversation_id::text
        || ':epoch:' || v_conversation.channel_epoch::text;

    perform realtime.send(
        jsonb_build_object(
            'conversation_id', v_conversation.conversation_id,
            'message_id', v_message.message_id,
            'sequence', v_message.sequence,
            'sender_subject', v_message.sender_subject,
            'body', v_message.body,
            'created_at', v_message.created_at,
            'channel_epoch', v_conversation.channel_epoch
        ),
        'message_created',
        v_topic,
        true
    );

    return jsonb_build_object(
        'message_id', v_message.message_id,
        'conversation_id', v_message.conversation_id,
        'sequence', v_message.sequence,
        'created_at', v_message.created_at,
        'channel_epoch', v_conversation.channel_epoch,
        'idempotent_replay', false
    );
end;
$function$;

create or replace function public.vvip_social_list_messages(
    p_conversation_id uuid,
    p_after_sequence bigint default 0,
    p_limit integer default 50
)
returns table (
    message_id uuid,
    conversation_id uuid,
    sequence bigint,
    sender_subject text,
    body text,
    created_at timestamptz
)
language plpgsql
stable
security definer set search_path = pg_catalog, public
as $function$
declare
    v_actor text := public.vvip_marketplace_actor_id();
    v_limit integer;
begin
    if v_actor is null or not public.vvip_social_subject_is_valid(v_actor) then
        raise exception 'SOCIAL_AUTH_REQUIRED';
    end if;
    if p_conversation_id is null or p_after_sequence is null or p_after_sequence < 0 then
        raise exception 'SOCIAL_MESSAGE_CURSOR_INVALID';
    end if;
    if p_limit is null or p_limit not between 1 and 100 then
        raise exception 'SOCIAL_MESSAGE_LIMIT_INVALID';
    end if;
    v_limit := least(p_limit, 100);

    if not exists (
        select 1
        from public.vvip_social_conversation_members member
        where member.conversation_id = p_conversation_id
          and member.member_subject = v_actor
    ) then
        raise exception 'SOCIAL_CONVERSATION_MEMBER_REQUIRED';
    end if;

    return query
    select message.message_id,
           message.conversation_id,
           message.sequence,
           message.sender_subject,
           message.body,
           message.created_at
      from public.vvip_social_messages message
     where message.conversation_id = p_conversation_id
       and message.sequence > p_after_sequence
     order by message.sequence asc
     limit v_limit;
end;
$function$;

create or replace function public.vvip_social_mark_read(
    p_conversation_id uuid,
    p_sequence bigint
)
returns jsonb
language plpgsql
security definer set search_path = pg_catalog, public
as $function$
declare
    v_actor text := public.vvip_marketplace_actor_id();
    v_conversation public.vvip_social_conversations%rowtype;
    v_previous bigint;
    v_effective bigint;
    v_topic text;
begin
    if v_actor is null or not public.vvip_social_subject_is_valid(v_actor) then
        raise exception 'SOCIAL_AUTH_REQUIRED';
    end if;
    if p_conversation_id is null or p_sequence is null or p_sequence < 0 then
        raise exception 'SOCIAL_READ_CURSOR_INVALID';
    end if;

    select conversation.*
      into v_conversation
      from public.vvip_social_conversations conversation
     where conversation.conversation_id = p_conversation_id
     for update;

    if not found then
        raise exception 'SOCIAL_CONVERSATION_NOT_FOUND';
    end if;

    if not exists (
        select 1
        from public.vvip_social_conversation_members member
        where member.conversation_id = p_conversation_id
          and member.member_subject = v_actor
    ) then
        raise exception 'SOCIAL_CONVERSATION_MEMBER_REQUIRED';
    end if;

    if p_sequence > v_conversation.last_message_sequence then
        raise exception 'SOCIAL_READ_CURSOR_BEYOND_TAIL';
    end if;

    select cursor.last_read_sequence
      into v_previous
      from public.vvip_social_read_cursors cursor
     where cursor.conversation_id = p_conversation_id
       and cursor.member_subject = v_actor
     for update;

    v_previous := coalesce(v_previous, 0);
    v_effective := greatest(v_previous, p_sequence);

    insert into public.vvip_social_read_cursors (
        conversation_id,
        member_subject,
        last_read_sequence,
        updated_at
    ) values (
        p_conversation_id,
        v_actor,
        v_effective,
        statement_timestamp()
    )
    on conflict (conversation_id, member_subject) do update
        set last_read_sequence = greatest(
                public.vvip_social_read_cursors.last_read_sequence,
                excluded.last_read_sequence
            ),
            updated_at = case
                when excluded.last_read_sequence > public.vvip_social_read_cursors.last_read_sequence
                    then statement_timestamp()
                else public.vvip_social_read_cursors.updated_at
            end
    returning last_read_sequence into v_effective;

    if v_effective > v_previous
       and not public.vvip_social_is_blocked_pair(
           v_conversation.subject_low,
           v_conversation.subject_high
       ) then
        v_topic := 'conversation:' || p_conversation_id::text
            || ':epoch:' || v_conversation.channel_epoch::text;

        perform realtime.send(
            jsonb_build_object(
                'conversation_id', p_conversation_id,
                'member_subject', v_actor,
                'last_read_sequence', v_effective,
                'channel_epoch', v_conversation.channel_epoch,
                'updated_at', statement_timestamp()
            ),
            'read_cursor_advanced',
            v_topic,
            true
        );
    end if;

    return jsonb_build_object(
        'conversation_id', p_conversation_id,
        'member_subject', v_actor,
        'last_read_sequence', v_effective,
        'advanced', v_effective > v_previous
    );
end;
$function$;

create or replace function public.vvip_social_get_channel_ticket(
    p_conversation_id uuid
)
returns jsonb
language plpgsql
stable
security definer set search_path = pg_catalog, public
as $function$
declare
    v_actor text := public.vvip_marketplace_actor_id();
    v_conversation public.vvip_social_conversations%rowtype;
begin
    if v_actor is null or not public.vvip_social_subject_is_valid(v_actor) then
        raise exception 'SOCIAL_AUTH_REQUIRED';
    end if;

    select conversation.*
      into v_conversation
      from public.vvip_social_conversations conversation
     where conversation.conversation_id = p_conversation_id;

    if not found then
        raise exception 'SOCIAL_CONVERSATION_NOT_FOUND';
    end if;

    if not exists (
        select 1
        from public.vvip_social_conversation_members member
        where member.conversation_id = p_conversation_id
          and member.member_subject = v_actor
          and member.membership_state = 'active'
    ) then
        raise exception 'SOCIAL_CONVERSATION_MEMBER_REQUIRED';
    end if;

    if public.vvip_social_is_blocked_pair(v_conversation.subject_low, v_conversation.subject_high) then
        raise exception 'SOCIAL_BLOCK_ACTIVE';
    end if;

    return jsonb_build_object(
        'conversation_id', v_conversation.conversation_id,
        'topic', 'conversation:' || v_conversation.conversation_id::text
            || ':epoch:' || v_conversation.channel_epoch::text,
        'channel_epoch', v_conversation.channel_epoch,
        'membership_version', v_conversation.membership_version
    );
end;
$function$;

create or replace function public.vvip_social_realtime_topic_authorized(
    p_topic text,
    p_extension text
)
returns boolean
language plpgsql
stable
security definer set search_path = pg_catalog, public
as $function$
declare
    v_actor text := public.vvip_marketplace_actor_id();
    v_parts text[];
    v_conversation_id uuid;
    v_epoch bigint;
begin
    if v_actor is null or not public.vvip_social_subject_is_valid(v_actor) then
        return false;
    end if;
    if p_extension not in ('broadcast', 'presence') then
        return false;
    end if;

    v_parts := regexp_match(
        coalesce(p_topic, ''),
        '^conversation:([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}):epoch:([1-9][0-9]*)$'
    );
    if v_parts is null then
        return false;
    end if;

    begin
        v_conversation_id := v_parts[1]::uuid;
        v_epoch := v_parts[2]::bigint;
    exception
        when invalid_text_representation or numeric_value_out_of_range then
            return false;
    end;

    return exists (
        select 1
        from public.vvip_social_conversations conversation
        join public.vvip_social_conversation_members member
          on member.conversation_id = conversation.conversation_id
         and member.member_subject = v_actor
         and member.membership_state = 'active'
        where conversation.conversation_id = v_conversation_id
          and conversation.channel_epoch = v_epoch
          and not public.vvip_social_is_blocked_pair(
              conversation.subject_low,
              conversation.subject_high
          )
    );
end;
$function$;

create or replace function public.vvip_social_bump_conversation_epoch_for_block()
returns trigger
language plpgsql
security definer set search_path = pg_catalog, public
as $function$
declare
    v_left text;
    v_right text;
begin
    if TG_OP = 'INSERT' then
        v_left := NEW.blocker_subject;
        v_right := NEW.blocked_subject;
    elsif TG_OP = 'DELETE' then
        v_left := OLD.blocker_subject;
        v_right := OLD.blocked_subject;
    else
        raise exception 'SOCIAL_BLOCK_EPOCH_TRIGGER_INVALID_OP';
    end if;

    update public.vvip_social_conversations
       set channel_epoch = channel_epoch + 1,
           membership_version = membership_version + 1,
           updated_at = statement_timestamp()
     where subject_low = least(v_left, v_right)
       and subject_high = greatest(v_left, v_right);

    if TG_OP = 'INSERT' then
        return NEW;
    end if;
    return OLD;
end;
$function$;

create trigger vvip_social_block_conversation_epoch
    after insert or delete on public.vvip_social_blocks
    for each row execute function public.vvip_social_bump_conversation_epoch_for_block();

-- `realtime.messages` is Supabase-owned. Gate 3 adds policies only; it does not create
-- custom objects in the realtime schema. Policies are private-topic authorization gates.
create policy vvip_social_realtime_receive_current_epoch
on realtime.messages
for select
to authenticated
using (
    extension in ('broadcast', 'presence')
    and public.vvip_social_realtime_topic_authorized(
        (select realtime.topic()),
        extension::text
    )
);

create policy vvip_social_realtime_presence_current_epoch
on realtime.messages
for insert
to authenticated
with check (
    extension = 'presence'
    and public.vvip_social_realtime_topic_authorized(
        (select realtime.topic()),
        extension::text
    )
);

revoke all on function public.vvip_social_open_direct_conversation(text, text)
    from public, anon;
revoke all on function public.vvip_social_send_message(uuid, uuid, text)
    from public, anon;
revoke all on function public.vvip_social_list_messages(uuid, bigint, integer)
    from public, anon;
revoke all on function public.vvip_social_mark_read(uuid, bigint)
    from public, anon;
revoke all on function public.vvip_social_get_channel_ticket(uuid)
    from public, anon;
revoke all on function public.vvip_social_realtime_topic_authorized(text, text)
    from public, anon;
revoke all on function public.vvip_social_bump_conversation_epoch_for_block()
    from public, anon, authenticated;

grant execute on function public.vvip_social_open_direct_conversation(text, text) to authenticated;
grant execute on function public.vvip_social_send_message(uuid, uuid, text) to authenticated;
grant execute on function public.vvip_social_list_messages(uuid, bigint, integer) to authenticated;
grant execute on function public.vvip_social_mark_read(uuid, bigint) to authenticated;
grant execute on function public.vvip_social_get_channel_ticket(uuid) to authenticated;
-- Required only so authenticated RLS evaluation on realtime.messages can invoke the
-- actor-scoped boolean helper. It cannot authorize or inspect another actor's topic.
grant execute on function public.vvip_social_realtime_topic_authorized(text, text) to authenticated;

comment on table public.vvip_social_conversations is
    'Gate 3 durable direct-conversation authority; Realtime topic epochs derive from this table.';
comment on table public.vvip_social_messages is
    'Gate 3 immutable durable message authority with per-conversation sequence ordering.';
comment on table public.vvip_social_read_cursors is
    'Gate 3 monotonic durable read cursor authority.';

commit;
