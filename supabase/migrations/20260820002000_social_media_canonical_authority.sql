-- VVIP TIGER Gate 2 — Sovereign Social Media Canonical Authority 2026.
-- Repository/local-rehearsal migration only. No remote/Production apply is authorized here.
-- Browser roles never provide canonical MIME/bytes/dimensions/SHA/path/verifier facts.

begin;

-- ---------------------------------------------------------------------------
-- Private quarantine/canonical storage envelope. MIME is defense-in-depth only;
-- the trusted finalizer re-identifies the actual bytes before any promotion.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'social-private-media',
    'social-private-media',
    false,
    15728640,
    array['image/jpeg', 'image/webp']::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create table public.vvip_social_media_assets (
    media_id uuid primary key default gen_random_uuid(),
    ticket_id uuid not null unique default gen_random_uuid(),
    owner_subject text not null,
    post_id uuid not null references public.vvip_social_posts(post_id) on delete cascade,
    idempotency_key text not null,
    bucket_id text not null default 'social-private-media',
    quarantine_storage_path text not null unique,
    media_state text not null default 'reserved'
        check (media_state in ('reserved', 'quarantined', 'inspecting', 'ready', 'failed', 'expired')),
    upload_lease_expires_at timestamptz not null,
    uploaded_at timestamptz,
    source_sha256 text,
    source_mime_type text,
    source_byte_size integer,
    source_width integer,
    source_height integer,
    canonical_storage_path text unique,
    canonical_sha256 text unique,
    canonical_mime_type text,
    canonical_byte_size integer,
    canonical_width integer,
    canonical_height integer,
    canonical_verified_at timestamptz,
    canonical_verifier text,
    verifier_version text,
    failure_code text,
    created_at timestamptz not null default statement_timestamp(),
    updated_at timestamptz not null default statement_timestamp(),
    check (owner_subject like 'user\_%' escape '\'),
    check (length(idempotency_key) between 16 and 128),
    check (bucket_id = 'social-private-media'),
    check (quarantine_storage_path like 'quarantine/%' and quarantine_storage_path like '%.blob'),
    check (upload_lease_expires_at > created_at),
    check (
        (media_state = 'ready'
         and source_sha256 ~ '^[0-9a-f]{64}$'
         and source_mime_type in ('image/jpeg', 'image/webp')
         and source_byte_size between 1 and 15728640
         and source_width between 320 and 8192
         and source_height between 240 and 8192
         and (source_width::bigint * source_height::bigint) <= 40000000
         and canonical_storage_path like 'canonical/media/%'
         and canonical_sha256 ~ '^[0-9a-f]{64}$'
         and canonical_mime_type = 'image/jpeg'
         and canonical_byte_size between 1 and 5242880
         and canonical_width = 1600
         and canonical_height = 1200
         and canonical_verified_at is not null
         and length(canonical_verifier) between 1 and 80
         and length(verifier_version) between 1 and 80
         and failure_code is null)
        or
        (media_state <> 'ready'
         and canonical_storage_path is null
         and canonical_sha256 is null
         and canonical_mime_type is null
         and canonical_byte_size is null
         and canonical_width is null
         and canonical_height is null
         and canonical_verified_at is null
         and canonical_verifier is null
         and verifier_version is null)
    ),
    unique (owner_subject, post_id, idempotency_key)
);

create index vvip_social_media_assets_post_idx
    on public.vvip_social_media_assets (post_id, media_state, created_at desc);
create index vvip_social_media_assets_lease_idx
    on public.vvip_social_media_assets (media_state, upload_lease_expires_at)
    where media_state in ('reserved', 'quarantined');

create table public.vvip_social_media_passports (
    media_id uuid primary key references public.vvip_social_media_assets(media_id) on delete restrict,
    owner_subject text not null,
    post_id uuid not null,
    source_sha256 text not null check (source_sha256 ~ '^[0-9a-f]{64}$'),
    canonical_sha256 text not null unique check (canonical_sha256 ~ '^[0-9a-f]{64}$'),
    canonical_storage_path text not null unique check (canonical_storage_path like 'canonical/media/%'),
    canonical_mime_type text not null check (canonical_mime_type = 'image/jpeg'),
    canonical_byte_size integer not null check (canonical_byte_size between 1 and 5242880),
    canonical_width integer not null check (canonical_width = 1600),
    canonical_height integer not null check (canonical_height = 1200),
    canonical_verifier text not null,
    verifier_version text not null,
    verified_at timestamptz not null,
    created_at timestamptz not null default statement_timestamp(),
    check (owner_subject like 'user\_%' escape '\'),
    check (length(canonical_verifier) between 1 and 80),
    check (length(verifier_version) between 1 and 80)
);

create table public.vvip_social_media_read_grants (
    grant_id uuid primary key default gen_random_uuid(),
    media_id uuid not null references public.vvip_social_media_assets(media_id) on delete cascade,
    actor_subject text not null,
    token_hash text not null unique,
    expires_at timestamptz not null,
    consumed_at timestamptz,
    created_at timestamptz not null default statement_timestamp(),
    check (actor_subject like 'user\_%' escape '\'),
    check (token_hash ~ '^[0-9a-f]{64}$'),
    check (expires_at > created_at)
);

create index vvip_social_media_read_grants_expiry_idx
    on public.vvip_social_media_read_grants (media_id, expires_at)
    where consumed_at is null;

create table public.vvip_social_media_webhook_inbox (
    event_id uuid primary key default gen_random_uuid(),
    idempotency_key text not null unique,
    payload_sha256 text not null,
    media_id uuid not null references public.vvip_social_media_assets(media_id) on delete cascade,
    event_kind text not null default 'upload.completed',
    event_state text not null default 'pending'
        check (event_state in ('pending', 'processing', 'completed', 'dead_letter')),
    attempt_count smallint not null default 0 check (attempt_count between 0 and 5),
    next_attempt_at timestamptz not null default statement_timestamp(),
    locked_at timestamptz,
    completed_at timestamptz,
    last_error_code text,
    created_at timestamptz not null default statement_timestamp(),
    updated_at timestamptz not null default statement_timestamp(),
    check (length(idempotency_key) between 16 and 160),
    check (payload_sha256 ~ '^[0-9a-f]{64}$'),
    check (event_kind = 'upload.completed'),
    check (last_error_code is null or length(last_error_code) between 1 and 120)
);

create index vvip_social_media_webhook_due_idx
    on public.vvip_social_media_webhook_inbox (event_state, next_attempt_at, created_at)
    where event_state = 'pending';

alter table public.vvip_social_media_assets enable row level security;
alter table public.vvip_social_media_assets force row level security;
alter table public.vvip_social_media_passports enable row level security;
alter table public.vvip_social_media_passports force row level security;
alter table public.vvip_social_media_read_grants enable row level security;
alter table public.vvip_social_media_read_grants force row level security;
alter table public.vvip_social_media_webhook_inbox enable row level security;
alter table public.vvip_social_media_webhook_inbox force row level security;

revoke all privileges on table public.vvip_social_media_assets from public, anon, authenticated;
revoke all privileges on table public.vvip_social_media_passports from public, anon, authenticated;
revoke all privileges on table public.vvip_social_media_read_grants from public, anon, authenticated;
revoke all privileges on table public.vvip_social_media_webhook_inbox from public, anon, authenticated;
revoke all privileges on table public.vvip_social_media_assets from service_role;
revoke all privileges on table public.vvip_social_media_passports from service_role;
revoke all privileges on table public.vvip_social_media_read_grants from service_role;
revoke all privileges on table public.vvip_social_media_webhook_inbox from service_role;

-- Passports are append-only even for ordinary privileged application roles.
create function public.vvip_social_media_guard_passport_immutable()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $function$
begin
    raise exception 'SOCIAL_MEDIA_PASSPORT_IMMUTABLE';
end;
$function$;

create trigger vvip_social_media_passport_immutable
before update or delete on public.vvip_social_media_passports
for each row execute function public.vvip_social_media_guard_passport_immutable();

-- ---------------------------------------------------------------------------
-- Authenticated reservation: exactly post_id + idempotency key.
-- ---------------------------------------------------------------------------
create function public.vvip_social_media_reserve_upload(
    target_post uuid,
    request_idempotency_key text
)
returns table (
    media_id uuid,
    ticket_id uuid,
    bucket_id text,
    quarantine_storage_path text,
    upload_lease_expires_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
    v_actor text := public.vvip_marketplace_actor_id();
    v_post public.vvip_social_posts%rowtype;
    v_existing public.vvip_social_media_assets%rowtype;
    v_media uuid := gen_random_uuid();
    v_ticket uuid := gen_random_uuid();
    v_key text := btrim(coalesce(request_idempotency_key, ''));
    v_path text;
    v_expiry timestamptz := statement_timestamp() + interval '5 minutes';
begin
    if v_actor is null or v_actor not like 'user\_%' escape '\' then
        raise exception 'SOCIAL_AUTH_REQUIRED';
    end if;
    if target_post is null then
        raise exception 'SOCIAL_MEDIA_POST_REQUIRED';
    end if;
    if length(v_key) not between 16 and 128 then
        raise exception 'SOCIAL_MEDIA_IDEMPOTENCY_KEY_INVALID';
    end if;

    select post.* into v_post
    from public.vvip_social_posts post
    where post.post_id = target_post
    for share;

    if not found then
        raise exception 'SOCIAL_MEDIA_POST_NOT_FOUND';
    end if;
    if v_post.author_subject <> v_actor then
        raise exception 'SOCIAL_MEDIA_POST_OWNER_REQUIRED';
    end if;

    select asset.* into v_existing
    from public.vvip_social_media_assets asset
    where asset.owner_subject = v_actor
      and asset.post_id = target_post
      and asset.idempotency_key = v_key
    for update;

    if found then
        return query select
            v_existing.media_id,
            v_existing.ticket_id,
            v_existing.bucket_id,
            v_existing.quarantine_storage_path,
            v_existing.upload_lease_expires_at;
        return;
    end if;

    v_path := 'quarantine/' || v_actor || '/' || v_ticket::text || '.blob';

    insert into public.vvip_social_media_assets (
        media_id,
        ticket_id,
        owner_subject,
        post_id,
        idempotency_key,
        quarantine_storage_path,
        upload_lease_expires_at
    ) values (
        v_media,
        v_ticket,
        v_actor,
        target_post,
        v_key,
        v_path,
        v_expiry
    );

    return query select v_media, v_ticket, 'social-private-media'::text, v_path, v_expiry;
end;
$function$;

-- ---------------------------------------------------------------------------
-- Visibility-aware one-time read capability. Raw token is returned once;
-- database stores only SHA-256.
-- ---------------------------------------------------------------------------
create function public.vvip_social_media_request_read(target_media uuid)
returns table (
    media_id uuid,
    canonical_storage_path text,
    read_token text,
    expires_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
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
      and asset.media_state = 'ready';

    if not found then
        raise exception 'SOCIAL_MEDIA_NOT_READY';
    end if;
    if not public.vvip_social_can_view_post(v_asset.post_id, v_actor) then
        raise exception 'SOCIAL_MEDIA_READ_DENIED';
    end if;

    v_token := encode(extensions.gen_random_bytes(32), 'hex');
    v_hash := encode(extensions.digest(convert_to(v_token, 'UTF8'), 'sha256'), 'hex');

    insert into public.vvip_social_media_read_grants (
        media_id, actor_subject, token_hash, expires_at
    ) values (
        target_media, v_actor, v_hash, v_expiry
    );

    return query select target_media, v_asset.canonical_storage_path, v_token, v_expiry;
end;
$function$;

create function public.vvip_social_media_consume_read(
    target_media uuid,
    grant_token text
)
returns table (
    media_id uuid,
    canonical_storage_path text
)
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $function$
declare
    v_hash text;
    v_grant public.vvip_social_media_read_grants%rowtype;
    v_asset public.vvip_social_media_assets%rowtype;
begin
    if grant_token is null or grant_token !~ '^[0-9a-f]{64}$' then
        raise exception 'SOCIAL_MEDIA_READ_TOKEN_INVALID';
    end if;
    v_hash := encode(extensions.digest(convert_to(grant_token, 'UTF8'), 'sha256'), 'hex');

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
      and asset.media_state = 'ready';

    if not found or not public.vvip_social_can_view_post(v_asset.post_id, v_grant.actor_subject) then
        raise exception 'SOCIAL_MEDIA_READ_DENIED';
    end if;

    update public.vvip_social_media_read_grants
    set consumed_at = statement_timestamp()
    where grant_id = v_grant.grant_id;

    return query select target_media, v_asset.canonical_storage_path;
end;
$function$;

-- ---------------------------------------------------------------------------
-- Trusted upload-completion inbox. Same key/same payload is replay-safe;
-- same key/different binding is a hard conflict.
-- ---------------------------------------------------------------------------
create function public.vvip_social_media_webhook_accept(
    event_idempotency_key text,
    event_payload_sha256 text,
    target_media uuid
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
    v_existing public.vvip_social_media_webhook_inbox%rowtype;
    v_asset public.vvip_social_media_assets%rowtype;
    v_event uuid;
begin
    if length(btrim(coalesce(event_idempotency_key, ''))) not between 16 and 160 then
        raise exception 'SOCIAL_MEDIA_WEBHOOK_IDEMPOTENCY_INVALID';
    end if;
    if event_payload_sha256 is null or event_payload_sha256 !~ '^[0-9a-f]{64}$' then
        raise exception 'SOCIAL_MEDIA_WEBHOOK_DIGEST_INVALID';
    end if;

    select inbox.* into v_existing
    from public.vvip_social_media_webhook_inbox inbox
    where inbox.idempotency_key = event_idempotency_key
    for update;

    if found then
        if v_existing.payload_sha256 <> event_payload_sha256
           or v_existing.media_id <> target_media then
            raise exception 'SOCIAL_MEDIA_WEBHOOK_IDEMPOTENCY_CONFLICT';
        end if;
        return v_existing.event_id;
    end if;

    select asset.* into v_asset
    from public.vvip_social_media_assets asset
    where asset.media_id = target_media
    for update;

    if not found then
        raise exception 'SOCIAL_MEDIA_NOT_FOUND';
    end if;
    if v_asset.media_state = 'ready' then
        raise exception 'SOCIAL_MEDIA_ALREADY_READY';
    end if;
    if v_asset.upload_lease_expires_at <= statement_timestamp() then
        update public.vvip_social_media_assets
        set media_state = 'expired',
            failure_code = 'SOCIAL_MEDIA_UPLOAD_LEASE_EXPIRED',
            updated_at = statement_timestamp()
        where media_id = target_media;
        raise exception 'SOCIAL_MEDIA_UPLOAD_LEASE_EXPIRED';
    end if;

    insert into public.vvip_social_media_webhook_inbox (
        idempotency_key, payload_sha256, media_id
    ) values (
        btrim(event_idempotency_key), event_payload_sha256, target_media
    ) returning event_id into v_event;

    update public.vvip_social_media_assets
    set media_state = 'quarantined',
        uploaded_at = statement_timestamp(),
        failure_code = null,
        updated_at = statement_timestamp()
    where media_id = target_media;

    return v_event;
end;
$function$;

create function public.vvip_social_media_webhook_claim()
returns table (
    event_id uuid,
    media_id uuid,
    bucket_id text,
    quarantine_storage_path text,
    upload_lease_expires_at timestamptz,
    attempt_count smallint
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
    v_event public.vvip_social_media_webhook_inbox%rowtype;
    v_asset public.vvip_social_media_assets%rowtype;
begin
    select inbox.* into v_event
    from public.vvip_social_media_webhook_inbox inbox
    where inbox.event_state = 'pending'
      and inbox.next_attempt_at <= statement_timestamp()
    order by inbox.next_attempt_at, inbox.created_at, inbox.event_id
    for update skip locked
    limit 1;

    if not found then
        return;
    end if;

    update public.vvip_social_media_webhook_inbox
    set event_state = 'processing',
        attempt_count = public.vvip_social_media_webhook_inbox.attempt_count + 1,
        locked_at = statement_timestamp(),
        updated_at = statement_timestamp()
    where public.vvip_social_media_webhook_inbox.event_id = v_event.event_id
    returning * into v_event;

    select asset.* into v_asset
    from public.vvip_social_media_assets asset
    where asset.media_id = v_event.media_id
    for update;

    if not found then
        raise exception 'SOCIAL_MEDIA_NOT_FOUND';
    end if;

    update public.vvip_social_media_assets
    set media_state = 'inspecting',
        updated_at = statement_timestamp()
    where public.vvip_social_media_assets.media_id = v_asset.media_id
      and media_state in ('quarantined', 'inspecting');

    return query select
        v_event.event_id,
        v_asset.media_id,
        v_asset.bucket_id,
        v_asset.quarantine_storage_path,
        v_asset.upload_lease_expires_at,
        v_event.attempt_count;
end;
$function$;

create function public.vvip_social_media_webhook_complete(target_event uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
begin
    update public.vvip_social_media_webhook_inbox
    set event_state = 'completed',
        completed_at = statement_timestamp(),
        locked_at = null,
        last_error_code = null,
        updated_at = statement_timestamp()
    where event_id = target_event
      and event_state = 'processing';

    if not found then
        raise exception 'SOCIAL_MEDIA_WEBHOOK_COMPLETE_STATE_INVALID';
    end if;
end;
$function$;

create function public.vvip_social_media_webhook_fail(
    target_event uuid,
    error_code text
)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
    v_event public.vvip_social_media_webhook_inbox%rowtype;
    v_attempts smallint;
    v_delay interval;
    v_error text := left(upper(regexp_replace(coalesce(error_code, 'WORKER_FAILURE'), '[^A-Z0-9_:-]', '_', 'g')), 120);
begin
    select inbox.* into v_event
    from public.vvip_social_media_webhook_inbox inbox
    where inbox.event_id = target_event
    for update;

    if not found or v_event.event_state <> 'processing' then
        raise exception 'SOCIAL_MEDIA_WEBHOOK_FAIL_STATE_INVALID';
    end if;

    v_attempts := v_event.attempt_count;

    if v_attempts >= 5 then
        update public.vvip_social_media_webhook_inbox
        set event_state = 'dead_letter',
            locked_at = null,
            last_error_code = v_error,
            updated_at = statement_timestamp()
        where event_id = target_event;

        update public.vvip_social_media_assets
        set media_state = 'failed',
            failure_code = v_error,
            updated_at = statement_timestamp()
        where media_id = v_event.media_id
          and media_state <> 'ready';

        return 'dead_letter';
    end if;

    -- Exponential schedule with bounded +/-15% jitter. The database, never the
    -- worker clock, owns next_attempt_at.
    v_delay := (
        case v_attempts
            when 1 then interval '30 seconds'
            when 2 then interval '2 minutes'
            when 3 then interval '8 minutes'
            when 4 then interval '32 minutes'
            else interval '32 minutes'
        end
    ) * (0.85 + random() * 0.30);

    update public.vvip_social_media_webhook_inbox
    set event_state = 'pending',
        next_attempt_at = statement_timestamp() + v_delay,
        locked_at = null,
        last_error_code = v_error,
        updated_at = statement_timestamp()
    where event_id = target_event;

    update public.vvip_social_media_assets
    set media_state = 'quarantined',
        failure_code = v_error,
        updated_at = statement_timestamp()
    where media_id = v_event.media_id
      and media_state <> 'ready';

    return 'pending';
end;
$function$;

-- ---------------------------------------------------------------------------
-- Canonical commit. Worker supplies facts derived from bytes; PostgreSQL
-- enforces the exact contract and independently derives the expected path.
-- ---------------------------------------------------------------------------
create function public.vvip_social_media_finalize(
    target_media uuid,
    source_digest text,
    source_mime text,
    source_size integer,
    source_image_width integer,
    source_image_height integer,
    canonical_path text,
    canonical_digest text,
    canonical_size integer,
    canonical_mime text,
    canonical_image_width integer,
    canonical_image_height integer,
    verifier_id text,
    verifier_build_version text
)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
    v_asset public.vvip_social_media_assets%rowtype;
    v_expected_path text;
    v_verified_at timestamptz := statement_timestamp();
begin
    if source_digest is null or source_digest !~ '^[0-9a-f]{64}$' then
        raise exception 'SOCIAL_MEDIA_SOURCE_SHA_INVALID';
    end if;
    if source_mime not in ('image/jpeg', 'image/webp') then
        raise exception 'SOCIAL_MEDIA_SOURCE_MIME_INVALID';
    end if;
    if source_size not between 1 and 15728640 then
        raise exception 'SOCIAL_MEDIA_SIZE_INVALID';
    end if;
    if source_image_width not between 320 and 8192
       or source_image_height not between 240 and 8192
       or (source_image_width::bigint * source_image_height::bigint) > 40000000 then
        raise exception 'SOCIAL_MEDIA_SOURCE_GEOMETRY_INVALID';
    end if;
    if canonical_digest is null or canonical_digest !~ '^[0-9a-f]{64}$' then
        raise exception 'SOCIAL_MEDIA_CANONICAL_SHA_INVALID';
    end if;
    if canonical_mime <> 'image/jpeg' then
        raise exception 'SOCIAL_MEDIA_CANONICAL_MIME_INVALID';
    end if;
    if canonical_size not between 1 and 5242880 then
        raise exception 'SOCIAL_MEDIA_CANONICAL_SIZE_INVALID';
    end if;
    if canonical_image_width <> 1600 or canonical_image_height <> 1200 then
        raise exception 'SOCIAL_MEDIA_CANONICAL_GEOMETRY_INVALID';
    end if;
    if length(btrim(coalesce(verifier_id, ''))) not between 1 and 80
       or length(btrim(coalesce(verifier_build_version, ''))) not between 1 and 80 then
        raise exception 'SOCIAL_MEDIA_VERIFIER_INVALID';
    end if;

    v_expected_path := 'canonical/media/' || substr(canonical_digest, 1, 2) || '/' || target_media::text || '.jpg';
    if canonical_path <> v_expected_path then
        raise exception 'SOCIAL_MEDIA_CANONICAL_PATH_INVALID';
    end if;

    select asset.* into v_asset
    from public.vvip_social_media_assets asset
    where asset.media_id = target_media
    for update;

    if not found then
        raise exception 'SOCIAL_MEDIA_NOT_FOUND';
    end if;
    if v_asset.media_state = 'ready' then
        if v_asset.canonical_sha256 = canonical_digest
           and v_asset.source_sha256 = source_digest then
            return v_asset.canonical_storage_path;
        end if;
        raise exception 'SOCIAL_MEDIA_FINALIZE_CONFLICT';
    end if;
    if v_asset.media_state <> 'inspecting' then
        raise exception 'SOCIAL_MEDIA_FINALIZE_STATE_INVALID';
    end if;

    update public.vvip_social_media_assets
    set media_state = 'ready',
        source_sha256 = source_digest,
        source_mime_type = source_mime,
        source_byte_size = source_size,
        source_width = source_image_width,
        source_height = source_image_height,
        canonical_storage_path = v_expected_path,
        canonical_sha256 = canonical_digest,
        canonical_mime_type = 'image/jpeg',
        canonical_byte_size = canonical_size,
        canonical_width = 1600,
        canonical_height = 1200,
        canonical_verified_at = v_verified_at,
        canonical_verifier = btrim(verifier_id),
        verifier_version = btrim(verifier_build_version),
        failure_code = null,
        updated_at = v_verified_at
    where media_id = target_media;

    insert into public.vvip_social_media_passports (
        media_id,
        owner_subject,
        post_id,
        source_sha256,
        canonical_sha256,
        canonical_storage_path,
        canonical_mime_type,
        canonical_byte_size,
        canonical_width,
        canonical_height,
        canonical_verifier,
        verifier_version,
        verified_at
    ) values (
        target_media,
        v_asset.owner_subject,
        v_asset.post_id,
        source_digest,
        canonical_digest,
        v_expected_path,
        'image/jpeg',
        canonical_size,
        1600,
        1200,
        btrim(verifier_id),
        btrim(verifier_build_version),
        v_verified_at
    );

    return v_expected_path;
end;
$function$;

-- Expire abandoned reservations and return quarantine paths to the trusted
-- worker for compensating storage deletion. No browser role can invoke this.
create function public.vvip_social_media_expire_quarantine()
returns table (
    media_id uuid,
    quarantine_storage_path text
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
begin
    return query
    with expired_rows as (
        update public.vvip_social_media_assets asset
        set media_state = 'expired',
            failure_code = 'SOCIAL_MEDIA_UPLOAD_LEASE_EXPIRED',
            updated_at = statement_timestamp()
        where asset.media_state in ('reserved', 'quarantined')
          and asset.upload_lease_expires_at <= statement_timestamp()
        returning asset.media_id, asset.quarantine_storage_path
    )
    select expired_rows.media_id, expired_rows.quarantine_storage_path
    from expired_rows;
end;
$function$;

-- Function privileges: default PUBLIC execute is removed everywhere first.
revoke all on function public.vvip_social_media_guard_passport_immutable() from public, anon, authenticated, service_role;
revoke all on function public.vvip_social_media_reserve_upload(uuid, text) from public, anon, authenticated, service_role;
revoke all on function public.vvip_social_media_request_read(uuid) from public, anon, authenticated, service_role;
revoke all on function public.vvip_social_media_consume_read(uuid, text) from public, anon, authenticated, service_role;
revoke all on function public.vvip_social_media_webhook_accept(text, text, uuid) from public, anon, authenticated, service_role;
revoke all on function public.vvip_social_media_webhook_claim() from public, anon, authenticated, service_role;
revoke all on function public.vvip_social_media_webhook_complete(uuid) from public, anon, authenticated, service_role;
revoke all on function public.vvip_social_media_webhook_fail(uuid, text) from public, anon, authenticated, service_role;
revoke all on function public.vvip_social_media_finalize(uuid, text, text, integer, integer, integer, text, text, integer, text, integer, integer, text, text) from public, anon, authenticated, service_role;
revoke all on function public.vvip_social_media_expire_quarantine() from public, anon, authenticated, service_role;

grant execute on function public.vvip_social_media_reserve_upload(uuid, text) to authenticated;
grant execute on function public.vvip_social_media_request_read(uuid) to authenticated;

grant execute on function public.vvip_social_media_consume_read(uuid, text) to service_role;
grant execute on function public.vvip_social_media_webhook_accept(text, text, uuid) to service_role;
grant execute on function public.vvip_social_media_webhook_claim() to service_role;
grant execute on function public.vvip_social_media_webhook_complete(uuid) to service_role;
grant execute on function public.vvip_social_media_webhook_fail(uuid, text) to service_role;
grant execute on function public.vvip_social_media_finalize(uuid, text, text, integer, integer, integer, text, text, integer, text, integer, integer, text, text) to service_role;
grant execute on function public.vvip_social_media_expire_quarantine() to service_role;

comment on table public.vvip_social_media_assets is
    'TIGER Gate 2 private Social media authority. Browser roles have no direct table CRUD.';
comment on table public.vvip_social_media_passports is
    'Immutable canonical byte evidence bound to one Social media asset.';
comment on function public.vvip_social_media_reserve_upload(uuid, text) is
    'Authenticated metadata-free reservation. Input is exactly post_id + idempotency_key.';
comment on function public.vvip_social_media_finalize(uuid, text, text, integer, integer, integer, text, text, integer, text, integer, integer, text, text) is
    'Service-only exact canonical commit: JPEG 1600x1200, DB-derived path, immutable passport.';

commit;
