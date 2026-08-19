-- VVIP TIGER Social Production Backend completion.
-- Adds real social media, direct messaging and notifications on top of the current Social Core.
-- Identity remains federated; actor authority is public.vvip_marketplace_actor_id().

begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'social-media',
  'social-media',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create table public.vvip_social_post_media (
  media_id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.vvip_social_posts(post_id) on delete cascade,
  owner_subject text not null default public.vvip_marketplace_actor_id(),
  storage_path text not null unique,
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  byte_size integer not null check (byte_size > 0 and byte_size <= 10485760),
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  alt_text text not null default '' check (char_length(alt_text) <= 500),
  position smallint not null default 0 check (position between 0 and 19),
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  check (owner_subject like 'user\_%' escape '\'),
  unique (post_id, position)
);

create index vvip_social_post_media_post_idx
  on public.vvip_social_post_media (post_id, position, created_at);
create index vvip_social_post_media_owner_idx
  on public.vvip_social_post_media (owner_subject, created_at desc);

create table public.vvip_social_conversations (
  conversation_id uuid primary key default gen_random_uuid(),
  conversation_kind text not null default 'direct' check (conversation_kind in ('direct', 'group')),
  direct_key text unique,
  created_by text not null default public.vvip_marketplace_actor_id(),
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  check (created_by like 'user\_%' escape '\'),
  check (
    (conversation_kind = 'direct' and direct_key is not null)
    or (conversation_kind = 'group' and direct_key is null)
  )
);

create table public.vvip_social_conversation_members (
  conversation_id uuid not null references public.vvip_social_conversations(conversation_id) on delete cascade,
  member_subject text not null,
  joined_at timestamptz not null default statement_timestamp(),
  last_read_at timestamptz,
  primary key (conversation_id, member_subject),
  check (member_subject like 'user\_%' escape '\')
);

create index vvip_social_conversation_members_subject_idx
  on public.vvip_social_conversation_members (member_subject, joined_at desc);

create table public.vvip_social_messages (
  message_id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.vvip_social_conversations(conversation_id) on delete cascade,
  sender_subject text not null,
  body text not null check (char_length(btrim(body)) between 1 and 4000),
  created_at timestamptz not null default statement_timestamp(),
  edited_at timestamptz,
  deleted_at timestamptz,
  check (sender_subject like 'user\_%' escape '\')
);

create index vvip_social_messages_conversation_idx
  on public.vvip_social_messages (conversation_id, created_at desc, message_id desc);
create index vvip_social_messages_sender_idx
  on public.vvip_social_messages (sender_subject, created_at desc);

create table public.vvip_social_notifications (
  notification_id uuid primary key default gen_random_uuid(),
  target_subject text not null,
  actor_subject text,
  notification_type text not null check (notification_type in ('friend_request', 'reaction', 'comment', 'reply', 'message', 'system')),
  entity_type text not null,
  entity_id text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default statement_timestamp(),
  read_at timestamptz,
  check (target_subject like 'user\_%' escape '\'),
  check (actor_subject is null or actor_subject like 'user\_%' escape '\')
);

create index vvip_social_notifications_target_idx
  on public.vvip_social_notifications (target_subject, created_at desc, notification_id desc);
create index vvip_social_notifications_unread_idx
  on public.vvip_social_notifications (target_subject, created_at desc)
  where read_at is null;

alter table public.vvip_social_post_media enable row level security;
alter table public.vvip_social_post_media force row level security;
alter table public.vvip_social_conversations enable row level security;
alter table public.vvip_social_conversations force row level security;
alter table public.vvip_social_conversation_members enable row level security;
alter table public.vvip_social_conversation_members force row level security;
alter table public.vvip_social_messages enable row level security;
alter table public.vvip_social_messages force row level security;
alter table public.vvip_social_notifications enable row level security;
alter table public.vvip_social_notifications force row level security;

revoke all privileges on table public.vvip_social_post_media from public, anon, authenticated;
revoke all privileges on table public.vvip_social_conversations from public, anon, authenticated;
revoke all privileges on table public.vvip_social_conversation_members from public, anon, authenticated;
revoke all privileges on table public.vvip_social_messages from public, anon, authenticated;
revoke all privileges on table public.vvip_social_notifications from public, anon, authenticated;

grant select, insert, update, delete on table public.vvip_social_post_media to authenticated;
grant select on table public.vvip_social_conversations to authenticated;
grant select on table public.vvip_social_conversation_members to authenticated;
grant select on table public.vvip_social_messages to authenticated;

create policy vvip_social_post_media_visible_read
on public.vvip_social_post_media
for select to authenticated
using (
  (select public.vvip_marketplace_actor_id()) is not null
  and exists (
    select 1
    from public.vvip_social_posts post
    where post.post_id = vvip_social_post_media.post_id
  )
);

create policy vvip_social_post_media_owner_create
on public.vvip_social_post_media
for insert to authenticated
with check (
  owner_subject = (select public.vvip_marketplace_actor_id())
  and storage_path like owner_subject || '/%'
  and exists (
    select 1
    from public.vvip_social_posts post
    where post.post_id = vvip_social_post_media.post_id
      and post.author_subject = (select public.vvip_marketplace_actor_id())
  )
);

create policy vvip_social_post_media_owner_update
on public.vvip_social_post_media
for update to authenticated
using (owner_subject = (select public.vvip_marketplace_actor_id()))
with check (
  owner_subject = (select public.vvip_marketplace_actor_id())
  and storage_path like owner_subject || '/%'
);

create policy vvip_social_post_media_owner_delete
on public.vvip_social_post_media
for delete to authenticated
using (owner_subject = (select public.vvip_marketplace_actor_id()));

create function public.vvip_social_is_conversation_member(
  p_conversation_id uuid,
  p_actor text default public.vvip_marketplace_actor_id()
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
  select p_actor is not null
    and p_actor like 'user\_%' escape '\'
    and exists (
      select 1
      from public.vvip_social_conversation_members member
      where member.conversation_id = p_conversation_id
        and member.member_subject = p_actor
    );
$function$;

create policy vvip_social_conversation_member_read
on public.vvip_social_conversations
for select to authenticated
using (public.vvip_social_is_conversation_member(conversation_id));

create policy vvip_social_conversation_member_list
on public.vvip_social_conversation_members
for select to authenticated
using (public.vvip_social_is_conversation_member(conversation_id));

create policy vvip_social_message_member_read
on public.vvip_social_messages
for select to authenticated
using (public.vvip_social_is_conversation_member(conversation_id));

create function public.vvip_social_create_conversation(p_peer_subject text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_actor text := public.vvip_marketplace_actor_id();
  v_direct_key text;
  v_conversation_id uuid;
begin
  if v_actor is null or v_actor not like 'user\_%' escape '\' then
    raise exception 'SOCIAL_AUTH_REQUIRED';
  end if;
  if p_peer_subject is null or p_peer_subject not like 'user\_%' escape '\' then
    raise exception 'SOCIAL_PEER_INVALID';
  end if;
  if p_peer_subject = v_actor then
    raise exception 'SOCIAL_SELF_CONVERSATION_DENIED';
  end if;

  v_direct_key := least(v_actor, p_peer_subject) || ':' || greatest(v_actor, p_peer_subject);

  insert into public.vvip_social_conversations (conversation_kind, direct_key, created_by)
  values ('direct', v_direct_key, v_actor)
  on conflict (direct_key) do update
    set updated_at = public.vvip_social_conversations.updated_at
  returning conversation_id into v_conversation_id;

  insert into public.vvip_social_conversation_members (conversation_id, member_subject)
  values
    (v_conversation_id, v_actor),
    (v_conversation_id, p_peer_subject)
  on conflict (conversation_id, member_subject) do nothing;

  return jsonb_build_object(
    'ok', true,
    'conversation_id', v_conversation_id,
    'peer_subject', p_peer_subject
  );
end;
$function$;

create function public.vvip_social_send_message(p_conversation_id uuid, p_body text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_actor text := public.vvip_marketplace_actor_id();
  v_message public.vvip_social_messages%rowtype;
  v_target text;
begin
  if v_actor is null or v_actor not like 'user\_%' escape '\' then
    raise exception 'SOCIAL_AUTH_REQUIRED';
  end if;
  if p_conversation_id is null or not public.vvip_social_is_conversation_member(p_conversation_id, v_actor) then
    raise exception 'SOCIAL_CONVERSATION_NOT_VISIBLE';
  end if;
  if p_body is null or not (char_length(btrim(p_body)) between 1 and 4000) then
    raise exception 'SOCIAL_MESSAGE_BODY_INVALID';
  end if;

  insert into public.vvip_social_messages (conversation_id, sender_subject, body)
  values (p_conversation_id, v_actor, btrim(p_body))
  returning * into v_message;

  update public.vvip_social_conversations
  set updated_at = statement_timestamp()
  where conversation_id = p_conversation_id;

  for v_target in
    select member.member_subject
    from public.vvip_social_conversation_members member
    where member.conversation_id = p_conversation_id
      and member.member_subject <> v_actor
  loop
    insert into public.vvip_social_notifications (
      target_subject, actor_subject, notification_type, entity_type, entity_id, payload
    ) values (
      v_target,
      v_actor,
      'message',
      'conversation',
      p_conversation_id::text,
      jsonb_build_object('message_id', v_message.message_id)
    );
  end loop;

  return jsonb_build_object(
    'ok', true,
    'message_id', v_message.message_id,
    'conversation_id', v_message.conversation_id,
    'body', v_message.body,
    'created_at', v_message.created_at
  );
end;
$function$;

create function public.vvip_social_message_list(
  p_conversation_id uuid,
  p_limit integer default 50
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_actor text := public.vvip_marketplace_actor_id();
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 100);
  v_items jsonb;
begin
  if v_actor is null or v_actor not like 'user\_%' escape '\' then
    raise exception 'SOCIAL_AUTH_REQUIRED';
  end if;
  if p_conversation_id is null or not public.vvip_social_is_conversation_member(p_conversation_id, v_actor) then
    raise exception 'SOCIAL_CONVERSATION_NOT_VISIBLE';
  end if;

  select coalesce(jsonb_agg(item order by (item->>'created_at')::timestamptz asc), '[]'::jsonb)
  into v_items
  from (
    select jsonb_build_object(
      'message_id', message.message_id,
      'sender_subject', message.sender_subject,
      'body', message.body,
      'created_at', message.created_at,
      'edited_at', message.edited_at,
      'deleted_at', message.deleted_at
    ) as item
    from public.vvip_social_messages message
    where message.conversation_id = p_conversation_id
    order by message.created_at desc, message.message_id desc
    limit v_limit
  ) recent;

  return jsonb_build_object('ok', true, 'conversation_id', p_conversation_id, 'items', v_items);
end;
$function$;

create function public.vvip_social_notification_list(p_limit integer default 50)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_actor text := public.vvip_marketplace_actor_id();
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 100);
  v_items jsonb;
  v_unread integer;
begin
  if v_actor is null or v_actor not like 'user\_%' escape '\' then
    raise exception 'SOCIAL_AUTH_REQUIRED';
  end if;

  select count(*)::integer
  into v_unread
  from public.vvip_social_notifications notification
  where notification.target_subject = v_actor
    and notification.read_at is null;

  select coalesce(jsonb_agg(item order by (item->>'created_at')::timestamptz desc), '[]'::jsonb)
  into v_items
  from (
    select jsonb_build_object(
      'notification_id', notification.notification_id,
      'actor_subject', notification.actor_subject,
      'notification_type', notification.notification_type,
      'entity_type', notification.entity_type,
      'entity_id', notification.entity_id,
      'payload', notification.payload,
      'created_at', notification.created_at,
      'read_at', notification.read_at
    ) as item
    from public.vvip_social_notifications notification
    where notification.target_subject = v_actor
    order by notification.created_at desc, notification.notification_id desc
    limit v_limit
  ) recent;

  return jsonb_build_object('ok', true, 'unread', v_unread, 'items', v_items);
end;
$function$;

create function public.vvip_social_notification_mark_read(p_notification_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_actor text := public.vvip_marketplace_actor_id();
  v_updated integer;
begin
  if v_actor is null or v_actor not like 'user\_%' escape '\' then
    raise exception 'SOCIAL_AUTH_REQUIRED';
  end if;

  update public.vvip_social_notifications notification
  set read_at = coalesce(notification.read_at, statement_timestamp())
  where notification.target_subject = v_actor
    and (p_notification_id is null or notification.notification_id = p_notification_id);

  get diagnostics v_updated = row_count;
  return jsonb_build_object('ok', true, 'updated', v_updated);
end;
$function$;

create function public.vvip_social_notify_friend_request()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
begin
  if new.relationship_state = 'pending' and new.requester_subject <> new.addressee_subject then
    insert into public.vvip_social_notifications (
      target_subject, actor_subject, notification_type, entity_type, entity_id
    ) values (
      new.addressee_subject,
      new.requester_subject,
      'friend_request',
      'relationship',
      new.relationship_id::text
    );
  end if;
  return new;
end;
$function$;

create function public.vvip_social_notify_reaction()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_target text;
begin
  select post.author_subject
  into v_target
  from public.vvip_social_posts post
  where post.post_id = new.post_id;

  if v_target is not null and v_target <> new.actor_subject then
    insert into public.vvip_social_notifications (
      target_subject, actor_subject, notification_type, entity_type, entity_id, payload
    ) values (
      v_target,
      new.actor_subject,
      'reaction',
      'post',
      new.post_id::text,
      jsonb_build_object('reaction_type', new.reaction_type)
    );
  end if;
  return new;
end;
$function$;

create function public.vvip_social_notify_comment()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_target text;
  v_type text := 'comment';
begin
  if new.parent_comment_id is not null then
    select parent.author_subject into v_target
    from public.vvip_social_comments parent
    where parent.comment_id = new.parent_comment_id;
    v_type := 'reply';
  else
    select post.author_subject into v_target
    from public.vvip_social_posts post
    where post.post_id = new.post_id;
  end if;

  if v_target is not null and v_target <> new.author_subject then
    insert into public.vvip_social_notifications (
      target_subject, actor_subject, notification_type, entity_type, entity_id,
      payload
    ) values (
      v_target,
      new.author_subject,
      v_type,
      'post',
      new.post_id::text,
      jsonb_build_object('comment_id', new.comment_id)
    );
  end if;
  return new;
end;
$function$;

create trigger vvip_social_relationship_notification
  after insert on public.vvip_social_relationships
  for each row execute function public.vvip_social_notify_friend_request();

create trigger vvip_social_reaction_notification
  after insert on public.vvip_social_reactions
  for each row execute function public.vvip_social_notify_reaction();

create trigger vvip_social_comment_notification
  after insert on public.vvip_social_comments
  for each row execute function public.vvip_social_notify_comment();

revoke all on function public.vvip_social_is_conversation_member(uuid, text) from public, anon, authenticated;
revoke all on function public.vvip_social_create_conversation(text) from public, anon, authenticated;
revoke all on function public.vvip_social_send_message(uuid, text) from public, anon, authenticated;
revoke all on function public.vvip_social_message_list(uuid, integer) from public, anon, authenticated;
revoke all on function public.vvip_social_notification_list(integer) from public, anon, authenticated;
revoke all on function public.vvip_social_notification_mark_read(uuid) from public, anon, authenticated;
revoke all on function public.vvip_social_notify_friend_request() from public, anon, authenticated;
revoke all on function public.vvip_social_notify_reaction() from public, anon, authenticated;
revoke all on function public.vvip_social_notify_comment() from public, anon, authenticated;

grant execute on function public.vvip_social_is_conversation_member(uuid, text) to authenticated;
grant execute on function public.vvip_social_create_conversation(text) to authenticated;
grant execute on function public.vvip_social_send_message(uuid, text) to authenticated;
grant execute on function public.vvip_social_message_list(uuid, integer) to authenticated;
grant execute on function public.vvip_social_notification_list(integer) to authenticated;
grant execute on function public.vvip_social_notification_mark_read(uuid) to authenticated;

-- Private social media storage: owners write only under their own actor-subject folder;
-- authenticated viewers can read only objects linked to a Social post visible through RLS.
drop policy if exists vvip_social_media_object_read on storage.objects;
drop policy if exists vvip_social_media_object_insert on storage.objects;
drop policy if exists vvip_social_media_object_update on storage.objects;
drop policy if exists vvip_social_media_object_delete on storage.objects;

create policy vvip_social_media_object_read
on storage.objects
for select to authenticated
using (
  bucket_id = 'social-media'
  and exists (
    select 1
    from public.vvip_social_post_media media
    where media.storage_path = storage.objects.name
  )
);

create policy vvip_social_media_object_insert
on storage.objects
for insert to authenticated
with check (
  bucket_id = 'social-media'
  and (storage.foldername(name))[1] = (select public.vvip_marketplace_actor_id())
);

create policy vvip_social_media_object_update
on storage.objects
for update to authenticated
using (
  bucket_id = 'social-media'
  and owner_id = (select auth.uid()::text)
)
with check (
  bucket_id = 'social-media'
  and (storage.foldername(name))[1] = (select public.vvip_marketplace_actor_id())
);

create policy vvip_social_media_object_delete
on storage.objects
for delete to authenticated
using (
  bucket_id = 'social-media'
  and (storage.foldername(name))[1] = (select public.vvip_marketplace_actor_id())
);

comment on table public.vvip_social_post_media is 'CURRENT Social Core post-media authority. Private Supabase Storage bucket: social-media.';
comment on table public.vvip_social_conversations is 'CURRENT Social Core conversation authority.';
comment on table public.vvip_social_messages is 'CURRENT Social Core message authority.';
comment on table public.vvip_social_notifications is 'CURRENT Social Core notification authority; client inserts are forbidden.';

commit;
