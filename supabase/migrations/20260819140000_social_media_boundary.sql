-- VVIP TIGER Social Media Boundary 2026.
-- Repository migration only. Remote/Production apply remains a separate protected gate.
-- Social media metadata is private, RPC-bounded, and inherits Social post visibility.
-- Object delivery is delegated to a trusted signer; this database layer never mints public URLs.

begin;
set local lock_timeout = '2s';

create table public.vvip_social_media (
    media_id uuid primary key default gen_random_uuid(),
    post_id uuid not null references public.vvip_social_posts (post_id) on delete cascade,
    owner_subject text not null,
    storage_path text not null,
    mime_type text not null check (mime_type in ('image/jpeg', 'image/webp')),
    byte_size integer not null check (byte_size between 1 and 10485760),
    width integer not null check (width between 1 and 4096),
    height integer not null check (height between 1 and 4096),
    sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
    created_at timestamptz not null default statement_timestamp(),
    updated_at timestamptz not null default statement_timestamp(),
    check (owner_subject like 'user\_%' escape '\'),
    check (storage_path like 'social-private/%'),
    check (storage_path not like '%..%'),
    check (position(E'\\' in storage_path) = 0),
    unique (storage_path)
);

create index vvip_social_media_post_idx
    on public.vvip_social_media (post_id, created_at);
create index vvip_social_media_owner_idx
    on public.vvip_social_media (owner_subject, created_at desc);

alter table public.vvip_social_media enable row level security;
alter table public.vvip_social_media force row level security;
revoke all on table public.vvip_social_media from public, anon, authenticated;

create policy vvip_social_media_visible_read
on public.vvip_social_media
for select
to authenticated
using (
    public.vvip_social_can_view_post(
        post_id,
        (select public.vvip_marketplace_actor_id())
    )
);

create policy vvip_social_media_owner_insert
on public.vvip_social_media
for insert
to authenticated
with check (
    owner_subject = (select public.vvip_marketplace_actor_id())
    and exists (
        select 1
        from public.vvip_social_posts post
        where post.post_id = vvip_social_media.post_id
          and post.author_subject = (select public.vvip_marketplace_actor_id())
    )
);

create policy vvip_social_media_owner_delete
on public.vvip_social_media
for delete
to authenticated
using (
    owner_subject = (select public.vvip_marketplace_actor_id())
);

create function public.vvip_social_media_register(
    p_post_id uuid,
    p_storage_path text,
    p_mime_type text,
    p_byte_size integer,
    p_width integer,
    p_height integer,
    p_sha256 text
)
returns jsonb
language plpgsql
security definer set search_path = pg_catalog, public
as $function$
declare
    v_actor text := public.vvip_marketplace_actor_id();
    v_media_id uuid;
begin
    if v_actor is null or v_actor not like 'user\_%' escape '\' then
        raise exception 'SOCIAL_AUTH_REQUIRED';
    end if;

    if not exists (
        select 1
        from public.vvip_social_posts post
        where post.post_id = p_post_id
          and post.author_subject = v_actor
    ) then
        raise exception 'SOCIAL_MEDIA_POST_OWNER_REQUIRED';
    end if;

    if p_storage_path is null
       or p_storage_path not like ('social-private/' || v_actor || '/' || p_post_id::text || '/%')
       or p_storage_path like '%..%'
       or position(E'\\' in p_storage_path) <> 0 then
        raise exception 'SOCIAL_MEDIA_PRIVATE_PATH_REQUIRED';
    end if;

    if p_mime_type not in ('image/jpeg', 'image/webp') then
        raise exception 'SOCIAL_MEDIA_MIME_INVALID';
    end if;
    if p_byte_size not between 1 and 10485760 then
        raise exception 'SOCIAL_MEDIA_SIZE_INVALID';
    end if;
    if p_width not between 1 and 4096 or p_height not between 1 and 4096 then
        raise exception 'SOCIAL_MEDIA_DIMENSIONS_INVALID';
    end if;
    if p_sha256 is null or p_sha256 !~ '^[0-9a-f]{64}$' then
        raise exception 'SOCIAL_MEDIA_DIGEST_INVALID';
    end if;

    insert into public.vvip_social_media (
        post_id,
        owner_subject,
        storage_path,
        mime_type,
        byte_size,
        width,
        height,
        sha256
    ) values (
        p_post_id,
        v_actor,
        p_storage_path,
        p_mime_type,
        p_byte_size,
        p_width,
        p_height,
        p_sha256
    )
    returning media_id into v_media_id;

    return jsonb_build_object(
        'ok', true,
        'media_id', v_media_id,
        'post_id', p_post_id,
        'storage_path', p_storage_path
    );
end;
$function$;

create function public.vvip_social_media_remove(p_media_id uuid)
returns boolean
language plpgsql
security definer set search_path = pg_catalog, public
as $function$
declare
    v_actor text := public.vvip_marketplace_actor_id();
    v_removed integer := 0;
begin
    if v_actor is null or v_actor not like 'user\_%' escape '\' then
        raise exception 'SOCIAL_AUTH_REQUIRED';
    end if;

    delete from public.vvip_social_media where media_id = p_media_id and owner_subject = v_actor;
    get diagnostics v_removed = row_count;
    return v_removed = 1;
end;
$function$;

create function public.vvip_social_media_read(p_post_id uuid)
returns table (
    media_id uuid,
    post_id uuid,
    storage_path text,
    mime_type text,
    byte_size integer,
    width integer,
    height integer,
    sha256 text
)
language plpgsql
stable
security definer set search_path = pg_catalog, public
as $function$
declare
    v_actor text := public.vvip_marketplace_actor_id();
begin
    if v_actor is null or v_actor not like 'user\_%' escape '\' then
        raise exception 'SOCIAL_AUTH_REQUIRED';
    end if;

    if not public.vvip_social_can_view_post(p_post_id, v_actor) then
        raise exception 'SOCIAL_POST_NOT_VISIBLE';
    end if;

    return query
    select
        media.media_id,
        media.post_id,
        media.storage_path,
        media.mime_type,
        media.byte_size,
        media.width,
        media.height,
        media.sha256
    from public.vvip_social_media media
    where media.post_id = p_post_id
    order by media.created_at, media.media_id;
end;
$function$;

revoke all on function public.vvip_social_media_register(uuid, text, text, integer, integer, integer, text)
    from public, anon, authenticated;
revoke all on function public.vvip_social_media_remove(uuid)
    from public, anon, authenticated;
revoke all on function public.vvip_social_media_read(uuid)
    from public, anon, authenticated;

grant execute on function public.vvip_social_media_register(uuid, text, text, integer, integer, integer, text)
    to authenticated;
grant execute on function public.vvip_social_media_remove(uuid)
    to authenticated;
grant execute on function public.vvip_social_media_read(uuid)
    to authenticated;

create table public.vvip_social_media_webhook_inbox (
    event_id uuid primary key default gen_random_uuid(),
    idempotency_key text not null unique,
    event_type text not null,
    payload_sha256 text not null check (payload_sha256 ~ '^[0-9a-f]{64}$'),
    processing_state text not null default 'pending'
        check (processing_state in ('pending', 'processing', 'completed', 'dead_letter')),
    attempt_count smallint not null default 0 check (attempt_count between 0 and 5),
    next_attempt_at timestamptz not null default statement_timestamp(),
    last_error_code text,
    created_at timestamptz not null default statement_timestamp(),
    updated_at timestamptz not null default statement_timestamp(),
    completed_at timestamptz,
    check (length(idempotency_key) between 16 and 160),
    check (length(event_type) between 1 and 120),
    check (last_error_code is null or length(last_error_code) between 1 and 120),
    check (
        (processing_state = 'completed' and completed_at is not null)
        or (processing_state <> 'completed' and completed_at is null)
    )
);

create index vvip_social_media_webhook_due_idx
    on public.vvip_social_media_webhook_inbox (processing_state, next_attempt_at);

alter table public.vvip_social_media_webhook_inbox enable row level security;
alter table public.vvip_social_media_webhook_inbox force row level security;
revoke all on table public.vvip_social_media_webhook_inbox from public, anon, authenticated;

create function public.vvip_social_media_webhook_accept(
    p_idempotency_key text,
    p_event_type text,
    p_payload_sha256 text
)
returns uuid
language plpgsql
security definer set search_path = pg_catalog, public
as $function$
declare
    v_event_id uuid;
begin
    if p_idempotency_key is null or length(p_idempotency_key) not between 16 and 160 then
        raise exception 'SOCIAL_MEDIA_WEBHOOK_IDEMPOTENCY_INVALID';
    end if;
    if p_event_type is null or length(p_event_type) not between 1 and 120 then
        raise exception 'SOCIAL_MEDIA_WEBHOOK_TYPE_INVALID';
    end if;
    if p_payload_sha256 is null or p_payload_sha256 !~ '^[0-9a-f]{64}$' then
        raise exception 'SOCIAL_MEDIA_WEBHOOK_DIGEST_INVALID';
    end if;

    insert into public.vvip_social_media_webhook_inbox (
        idempotency_key,
        event_type,
        payload_sha256
    ) values (
        p_idempotency_key,
        p_event_type,
        p_payload_sha256
    )
    on conflict (idempotency_key)
    do update set idempotency_key = excluded.idempotency_key where public.vvip_social_media_webhook_inbox.payload_sha256 = excluded.payload_sha256
    returning event_id into v_event_id;

    if v_event_id is null then
        raise exception 'SOCIAL_MEDIA_WEBHOOK_IDEMPOTENCY_CONFLICT';
    end if;

    return v_event_id;
end;
$function$;

create function public.vvip_social_media_webhook_claim()
returns table (
    event_id uuid,
    idempotency_key text,
    event_type text,
    payload_sha256 text,
    attempt_count smallint
)
language plpgsql
security definer set search_path = pg_catalog, public
as $function$
declare
    v_event public.vvip_social_media_webhook_inbox%rowtype;
begin
    select inbox.* into v_event
    from public.vvip_social_media_webhook_inbox inbox
    where inbox.processing_state = 'pending'
      and inbox.next_attempt_at <= statement_timestamp()
    order by inbox.next_attempt_at, inbox.created_at
    for update skip locked
    limit 1;

    if not found then
        return;
    end if;

    update public.vvip_social_media_webhook_inbox set processing_state = 'processing', attempt_count = attempt_count + 1, updated_at = statement_timestamp() where public.vvip_social_media_webhook_inbox.event_id = v_event.event_id;

    return query
    select
        v_event.event_id,
        v_event.idempotency_key,
        v_event.event_type,
        v_event.payload_sha256,
        (v_event.attempt_count + 1)::smallint;
end;
$function$;

create function public.vvip_social_media_webhook_complete(p_event_id uuid)
returns boolean
language plpgsql
security definer set search_path = pg_catalog, public
as $function$
declare
    v_updated integer := 0;
begin
    update public.vvip_social_media_webhook_inbox set processing_state = 'completed', completed_at = statement_timestamp(), last_error_code = null, updated_at = statement_timestamp() where event_id = p_event_id and processing_state = 'processing';
    get diagnostics v_updated = row_count;
    return v_updated = 1;
end;
$function$;

create function public.vvip_social_media_webhook_fail(
    p_event_id uuid,
    p_error_code text
)
returns text
language plpgsql
security definer set search_path = pg_catalog, public
as $function$
declare
    v_attempts smallint;
    v_state text;
begin
    if p_error_code is null or length(p_error_code) not between 1 and 120 then
        raise exception 'SOCIAL_MEDIA_WEBHOOK_ERROR_CODE_INVALID';
    end if;

    select attempt_count into v_attempts
    from public.vvip_social_media_webhook_inbox
    where event_id = p_event_id
      and processing_state = 'processing'
    for update;

    if not found then
        raise exception 'SOCIAL_MEDIA_WEBHOOK_NOT_PROCESSING';
    end if;

    v_state := case when v_attempts >= 5 then 'dead_letter' else 'pending' end;

    update public.vvip_social_media_webhook_inbox set processing_state = v_state, next_attempt_at = case when v_state = 'dead_letter' then next_attempt_at else statement_timestamp() + interval '5 minutes' end, last_error_code = p_error_code, updated_at = statement_timestamp() where event_id = p_event_id and processing_state = 'processing';

    return v_state;
end;
$function$;

revoke all on function public.vvip_social_media_webhook_accept(text, text, text)
    from public, anon, authenticated;
revoke all on function public.vvip_social_media_webhook_claim()
    from public, anon, authenticated;
revoke all on function public.vvip_social_media_webhook_complete(uuid)
    from public, anon, authenticated;
revoke all on function public.vvip_social_media_webhook_fail(uuid, text)
    from public, anon, authenticated;

grant execute on function public.vvip_social_media_webhook_accept(text, text, text)
    to service_role;
grant execute on function public.vvip_social_media_webhook_claim()
    to service_role;
grant execute on function public.vvip_social_media_webhook_complete(uuid)
    to service_role;
grant execute on function public.vvip_social_media_webhook_fail(uuid, text)
    to service_role;

commit;
