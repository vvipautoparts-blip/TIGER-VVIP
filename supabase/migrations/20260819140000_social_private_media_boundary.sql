-- VVIP TIGER Social Private Media Boundary 2026.
-- Repository migration only. Remote/Production apply remains a separate protected gate.
-- Social media stays private: database authorization issues one-time short-lived capabilities;
-- a trusted signer/finalizer consumes them and alone attests canonical bytes.

begin;
set local lock_timeout = '2s';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'social-private-media',
    'social-private-media',
    false,
    5242880,
    array['image/jpeg', 'image/webp']
)
on conflict (id) do update set name = excluded.name, public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create table public.vvip_social_media_assets (
    media_id uuid primary key default gen_random_uuid(),
    post_id uuid not null references public.vvip_social_posts (post_id) on delete cascade,
    owner_subject text not null default public.vvip_marketplace_actor_id(),
    idempotency_key text not null,
    source_storage_path text not null unique,
    mime_type text not null check (mime_type in ('image/jpeg', 'image/webp')),
    byte_size integer not null check (byte_size between 1 and 5242880),
    width integer not null check (width between 320 and 4096),
    height integer not null check (height between 240 and 4096),
    media_state text not null default 'PENDING_UPLOAD'
        check (media_state in ('PENDING_UPLOAD', 'PENDING_FINALIZATION', 'READY', 'FAILED', 'DEAD_LETTER')),
    finalization_attempt_count smallint not null default 0
        check (finalization_attempt_count between 0 and 3),
    canonical_storage_path text unique,
    source_sha256 text,
    canonical_sha256 text,
    canonical_mime_type text,
    canonical_byte_size integer,
    canonical_width integer,
    canonical_height integer,
    canonical_verified_at timestamptz,
    canonical_verifier text,
    last_error_code text,
    created_at timestamptz not null default statement_timestamp(),
    updated_at timestamptz not null default statement_timestamp(),
    unique (owner_subject, post_id, idempotency_key),
    check (owner_subject like 'user\_%' escape '\'),
    check (length(idempotency_key) between 8 and 128),
    check (length(source_storage_path) between 32 and 700),
    check (source_sha256 is null or source_sha256 ~ '^[0-9a-f]{64}$'),
    check (canonical_sha256 is null or canonical_sha256 ~ '^[0-9a-f]{64}$'),
    check (canonical_mime_type is null or canonical_mime_type in ('image/jpeg', 'image/webp')),
    check (canonical_byte_size is null or canonical_byte_size between 1 and 5242880),
    check (canonical_width is null or canonical_width between 320 and 4096),
    check (canonical_height is null or canonical_height between 240 and 4096),
    check (last_error_code is null or length(last_error_code) between 1 and 120),
    check (
        (
            media_state = 'READY'
            and canonical_storage_path is not null
            and source_sha256 is not null
            and canonical_sha256 is not null
            and canonical_mime_type is not null
            and canonical_byte_size is not null
            and canonical_width is not null
            and canonical_height is not null
            and canonical_verified_at is not null
            and nullif(btrim(canonical_verifier), '') is not null
            and last_error_code is null
        )
        or (
            media_state <> 'READY'
            and canonical_storage_path is null
            and source_sha256 is null
            and canonical_sha256 is null
            and canonical_mime_type is null
            and canonical_byte_size is null
            and canonical_width is null
            and canonical_height is null
            and canonical_verified_at is null
            and canonical_verifier is null
        )
    )
);

create index vvip_social_media_post_state_idx
    on public.vvip_social_media_assets (post_id, media_state, created_at desc);
create index vvip_social_media_owner_state_idx
    on public.vvip_social_media_assets (owner_subject, media_state, created_at desc);

create table public.vvip_social_media_read_grants (
    grant_id uuid primary key default gen_random_uuid(),
    media_id uuid not null references public.vvip_social_media_assets (media_id) on delete cascade,
    requester_subject text not null,
    token_hash text not null unique,
    expires_at timestamptz not null,
    consumed_at timestamptz,
    created_at timestamptz not null default statement_timestamp(),
    check (requester_subject like 'user\_%' escape '\'),
    check (token_hash ~ '^[0-9a-f]{64}$'),
    check (expires_at > created_at),
    check (consumed_at is null or consumed_at >= created_at)
);

create index vvip_social_media_read_grants_expiry_idx
    on public.vvip_social_media_read_grants (expires_at, consumed_at);

create table public.vvip_social_media_finalization_events (
    event_id uuid primary key default gen_random_uuid(),
    event_key text not null unique,
    media_id uuid not null references public.vvip_social_media_assets (media_id) on delete cascade,
    payload_sha256 text not null,
    event_state text not null default 'RECEIVED'
        check (event_state in ('RECEIVED', 'APPLIED', 'FAILED', 'DEAD_LETTER')),
    attempt_count smallint not null default 0 check (attempt_count between 0 and 3),
    error_code text,
    created_at timestamptz not null default statement_timestamp(),
    updated_at timestamptz not null default statement_timestamp(),
    applied_at timestamptz,
    check (length(event_key) between 8 and 160),
    check (payload_sha256 ~ '^[0-9a-f]{64}$'),
    check (error_code is null or length(error_code) between 1 and 120)
);

create index vvip_social_media_finalization_state_idx
    on public.vvip_social_media_finalization_events (event_state, updated_at desc);

alter table public.vvip_social_media_assets enable row level security;
alter table public.vvip_social_media_assets force row level security;
alter table public.vvip_social_media_read_grants enable row level security;
alter table public.vvip_social_media_read_grants force row level security;
alter table public.vvip_social_media_finalization_events enable row level security;
alter table public.vvip_social_media_finalization_events force row level security;

revoke all privileges on table public.vvip_social_media_assets from public, anon, authenticated;
revoke all privileges on table public.vvip_social_media_read_grants from public, anon, authenticated;
revoke all privileges on table public.vvip_social_media_finalization_events from public, anon, authenticated;

create function public.vvip_social_media_reserve_upload(
    target_post uuid,
    requested_mime text,
    requested_bytes integer,
    requested_width integer,
    requested_height integer,
    request_idempotency_key text
)
returns table (
    media_id uuid,
    bucket_id text,
    source_storage_path text
)
language plpgsql
security definer set search_path = pg_catalog, public, extensions
as $function$
declare
    v_actor text := public.vvip_marketplace_actor_id();
    v_owner text;
    v_existing public.vvip_social_media_assets%rowtype;
    v_media uuid;
    v_extension text;
    v_path text;
begin
    if v_actor is null or v_actor not like 'user\_%' escape '\' then
        raise exception 'SOCIAL_AUTH_REQUIRED';
    end if;
    if request_idempotency_key is null or length(btrim(request_idempotency_key)) not between 8 and 128 then
        raise exception 'SOCIAL_MEDIA_IDEMPOTENCY_KEY_INVALID';
    end if;
    if requested_mime not in ('image/jpeg', 'image/webp') then
        raise exception 'SOCIAL_MEDIA_MIME_INVALID';
    end if;
    if requested_bytes not between 1 and 5242880
       or requested_width not between 320 and 4096
       or requested_height not between 240 and 4096 then
        raise exception 'SOCIAL_MEDIA_ENVELOPE_INVALID';
    end if;

    select post.author_subject into v_owner
    from public.vvip_social_posts post
    where post.post_id = target_post
    for share;

    if not found then
        raise exception 'SOCIAL_POST_NOT_FOUND';
    end if;
    if v_owner <> v_actor then
        raise exception 'SOCIAL_MEDIA_POST_OWNER_REQUIRED';
    end if;

    select asset.* into v_existing
    from public.vvip_social_media_assets asset
    where asset.owner_subject = v_actor
      and asset.post_id = target_post
      and asset.idempotency_key = btrim(request_idempotency_key)
    for update;

    if found then
        if v_existing.mime_type <> requested_mime
           or v_existing.byte_size <> requested_bytes
           or v_existing.width <> requested_width
           or v_existing.height <> requested_height then
            raise exception 'SOCIAL_MEDIA_IDEMPOTENCY_REPLAY_MISMATCH';
        end if;
        return query select v_existing.media_id, 'social-private-media'::text, v_existing.source_storage_path;
        return;
    end if;

    v_media := gen_random_uuid();
    v_extension := case requested_mime when 'image/jpeg' then '.jpg' else '.webp' end;
    v_path := 'source/' || v_actor || '/' || target_post::text || '/' || v_media::text || v_extension;

    insert into public.vvip_social_media_assets (
        media_id,
        post_id,
        owner_subject,
        idempotency_key,
        source_storage_path,
        mime_type,
        byte_size,
        width,
        height
    ) values (
        v_media,
        target_post,
        v_actor,
        btrim(request_idempotency_key),
        v_path,
        requested_mime,
        requested_bytes,
        requested_width,
        requested_height
    );

    return query select v_media, 'social-private-media'::text, v_path;
end;
$function$;

create function public.vvip_social_media_can_upload_object(object_name text)
returns boolean
language sql
stable
security definer set search_path = pg_catalog, public
as $function$
    select exists (
        select 1
        from public.vvip_social_media_assets asset
        where asset.owner_subject = public.vvip_marketplace_actor_id()
          and asset.source_storage_path = object_name
          and asset.media_state = 'PENDING_UPLOAD'
    );
$function$;

create policy vvip_social_private_media_owner_insert
on storage.objects
for insert
to authenticated
with check (
    bucket_id = 'social-private-media'
    and public.vvip_social_media_can_upload_object(name)
);

create function public.vvip_social_media_request_read(target_media uuid)
returns table (
    media_id uuid,
    read_token text,
    expires_at timestamptz
)
language plpgsql
security definer set search_path = pg_catalog, public, extensions
as $function$
declare
    v_actor text := public.vvip_marketplace_actor_id();
    v_asset public.vvip_social_media_assets%rowtype;
    v_token text;
    v_hash text;
    v_expiry timestamptz := statement_timestamp() + interval '2 minutes';
begin
    if v_actor is null or v_actor not like 'user\_%' escape '\' then
        raise exception 'SOCIAL_AUTH_REQUIRED';
    end if;

    select asset.* into v_asset
    from public.vvip_social_media_assets asset
    where asset.media_id = target_media
      and asset.media_state = 'READY'
    for share;

    if not found then
        raise exception 'SOCIAL_MEDIA_NOT_READY';
    end if;
    if not public.vvip_social_can_view_post(v_asset.post_id, v_actor) then
        raise exception 'SOCIAL_MEDIA_NOT_VISIBLE';
    end if;

    v_token := encode(extensions.gen_random_bytes(32), 'hex');
    v_hash := encode(extensions.digest(convert_to(v_token, 'UTF8'), 'sha256'), 'hex');

    insert into public.vvip_social_media_read_grants (
        media_id,
        requester_subject,
        token_hash,
        expires_at
    ) values (
        target_media,
        v_actor,
        v_hash,
        v_expiry
    );

    return query select target_media, v_token, v_expiry;
end;
$function$;

create function public.vvip_social_media_consume_read(
    target_media uuid,
    read_token text
)
returns table (
    media_id uuid,
    canonical_storage_path text,
    canonical_mime_type text,
    canonical_byte_size integer
)
language plpgsql
security definer set search_path = pg_catalog, public, extensions
as $function$
declare
    v_hash text;
    v_grant public.vvip_social_media_read_grants%rowtype;
    v_asset public.vvip_social_media_assets%rowtype;
begin
    if read_token is null or length(read_token) <> 64 or read_token !~ '^[0-9a-f]{64}$' then
        raise exception 'SOCIAL_MEDIA_READ_TOKEN_INVALID';
    end if;

    v_hash := encode(extensions.digest(convert_to(read_token, 'UTF8'), 'sha256'), 'hex');

    select grant_row.* into v_grant
    from public.vvip_social_media_read_grants grant_row
    where grant_row.media_id = target_media
      and grant_row.token_hash = v_hash
      and grant_row.consumed_at is null
      and grant_row.expires_at > statement_timestamp()
    for update;

    if not found then
        raise exception 'SOCIAL_MEDIA_READ_GRANT_INVALID';
    end if;

    select asset.* into v_asset
    from public.vvip_social_media_assets asset
    where asset.media_id = target_media
      and asset.media_state = 'READY'
    for share;

    if not found or not public.vvip_social_can_view_post(v_asset.post_id, v_grant.requester_subject) then
        raise exception 'SOCIAL_MEDIA_READ_GRANT_REVOKED';
    end if;

    update public.vvip_social_media_read_grants set consumed_at = statement_timestamp() where grant_id = v_grant.grant_id;

    return query
    select
        v_asset.media_id,
        v_asset.canonical_storage_path,
        v_asset.canonical_mime_type,
        v_asset.canonical_byte_size;
end;
$function$;

create function public.vvip_social_media_apply_finalization_event(
    event_key text,
    target_media uuid,
    event_succeeded boolean,
    source_digest text default null,
    canonical_path text default null,
    canonical_digest text default null,
    canonical_mime text default null,
    canonical_size integer default null,
    canonical_image_width integer default null,
    canonical_image_height integer default null,
    verifier_id text default null,
    failure_code text default null
)
returns table (
    media_id uuid,
    event_state text,
    attempt_count smallint
)
language plpgsql
security definer set search_path = pg_catalog, public, extensions
as $function$
declare
    v_payload_hash text;
    v_existing public.vvip_social_media_finalization_events%rowtype;
    v_asset public.vvip_social_media_assets%rowtype;
    v_attempt smallint;
    v_state text;
    v_expected_path text;
    v_extension text;
begin
    if event_key is null or length(btrim(event_key)) not between 8 and 160 then
        raise exception 'SOCIAL_MEDIA_EVENT_KEY_INVALID';
    end if;

    v_payload_hash := encode(
        extensions.digest(
            convert_to(
                concat_ws('|',
                    target_media::text,
                    event_succeeded::text,
                    coalesce(source_digest, ''),
                    coalesce(canonical_path, ''),
                    coalesce(canonical_digest, ''),
                    coalesce(canonical_mime, ''),
                    coalesce(canonical_size::text, ''),
                    coalesce(canonical_image_width::text, ''),
                    coalesce(canonical_image_height::text, ''),
                    coalesce(verifier_id, ''),
                    coalesce(failure_code, '')
                ),
                'UTF8'
            ),
            'sha256'
        ),
        'hex'
    );

    insert into public.vvip_social_media_finalization_events (
        event_key,
        media_id,
        payload_sha256
    ) values (
        btrim(event_key),
        target_media,
        v_payload_hash
    )
    on conflict (event_key) do nothing;

    select event_row.* into v_existing
    from public.vvip_social_media_finalization_events event_row
    where event_row.event_key = btrim(event_key)
    for update;

    if v_existing.payload_sha256 <> v_payload_hash or v_existing.media_id <> target_media then
        raise exception 'SOCIAL_MEDIA_EVENT_REPLAY_MISMATCH';
    end if;
    if v_existing.event_state <> 'RECEIVED' then
        return query select v_existing.media_id, v_existing.event_state, v_existing.attempt_count;
        return;
    end if;

    select asset.* into v_asset
    from public.vvip_social_media_assets asset
    where asset.media_id = target_media
    for update;

    if not found then
        raise exception 'SOCIAL_MEDIA_NOT_FOUND';
    end if;
    if v_asset.media_state in ('READY', 'DEAD_LETTER') then
        raise exception 'SOCIAL_MEDIA_FINALIZATION_STATE_CLOSED';
    end if;

    v_attempt := (v_asset.finalization_attempt_count + 1)::smallint;
    if v_attempt > 3 then
        raise exception 'SOCIAL_MEDIA_FINALIZATION_ATTEMPTS_EXHAUSTED';
    end if;

    if event_succeeded then
        if source_digest is null or source_digest !~ '^[0-9a-f]{64}$'
           or canonical_digest is null or canonical_digest !~ '^[0-9a-f]{64}$'
           or canonical_mime not in ('image/jpeg', 'image/webp')
           or canonical_size not between 1 and 5242880
           or canonical_image_width not between 320 and 4096
           or canonical_image_height not between 240 and 4096
           or nullif(btrim(verifier_id), '') is null then
            raise exception 'SOCIAL_MEDIA_CANONICAL_EVIDENCE_INVALID';
        end if;

        v_extension := case canonical_mime when 'image/jpeg' then '.jpg' else '.webp' end;
        v_expected_path := 'canonical/' || v_asset.owner_subject || '/' || v_asset.post_id::text || '/' || v_asset.media_id::text || v_extension;
        if canonical_path is distinct from v_expected_path then
            raise exception 'SOCIAL_MEDIA_CANONICAL_PATH_INVALID';
        end if;

        update public.vvip_social_media_assets set media_state = 'READY', finalization_attempt_count = v_attempt, canonical_storage_path = canonical_path, source_sha256 = source_digest, canonical_sha256 = canonical_digest, canonical_mime_type = canonical_mime, canonical_byte_size = canonical_size, canonical_width = canonical_image_width, canonical_height = canonical_image_height, canonical_verified_at = statement_timestamp(), canonical_verifier = left(btrim(verifier_id), 80), last_error_code = null, updated_at = statement_timestamp() where public.vvip_social_media_assets.media_id = target_media;
        v_state := 'APPLIED';
    else
        if nullif(btrim(failure_code), '') is null then
            raise exception 'SOCIAL_MEDIA_FINALIZATION_FAILURE_CODE_REQUIRED';
        end if;
        v_state := case when v_attempt >= 3 then 'DEAD_LETTER' else 'FAILED' end;
        update public.vvip_social_media_assets set media_state = v_state, finalization_attempt_count = v_attempt, last_error_code = left(btrim(failure_code), 120), updated_at = statement_timestamp() where public.vvip_social_media_assets.media_id = target_media;
    end if;

    update public.vvip_social_media_finalization_events set event_state = v_state, attempt_count = v_attempt, error_code = case when event_succeeded then null else left(btrim(failure_code), 120) end, applied_at = statement_timestamp(), updated_at = statement_timestamp() where public.vvip_social_media_finalization_events.event_id = v_existing.event_id;

    return query select target_media, v_state, v_attempt;
end;
$function$;

-- Defense-in-depth marker: canonical fields are never browser-authoritative.
comment on table public.vvip_social_media_assets is
    'SOCIAL_MEDIA_CANONICAL_FIELDS_TRUSTED_ONLY; browser table CRUD is revoked; trusted finalizer alone attests canonical evidence.';

revoke all on function public.vvip_social_media_reserve_upload(uuid, text, integer, integer, integer, text) from public, anon, authenticated;
revoke all on function public.vvip_social_media_can_upload_object(text) from public, anon, authenticated;
revoke all on function public.vvip_social_media_request_read(uuid) from public, anon, authenticated;
revoke all on function public.vvip_social_media_consume_read(uuid, text) from public, anon, authenticated;
revoke all on function public.vvip_social_media_apply_finalization_event(text, uuid, boolean, text, text, text, text, integer, integer, integer, text, text) from public, anon, authenticated;

grant execute on function public.vvip_social_media_reserve_upload(uuid, text, integer, integer, integer, text) to authenticated;
grant execute on function public.vvip_social_media_can_upload_object(text) to authenticated;
grant execute on function public.vvip_social_media_request_read(uuid) to authenticated;
grant execute on function public.vvip_social_media_consume_read(uuid, text) to service_role;
grant execute on function public.vvip_social_media_apply_finalization_event(text, uuid, boolean, text, text, text, text, integer, integer, integer, text, text) to service_role;

commit;
