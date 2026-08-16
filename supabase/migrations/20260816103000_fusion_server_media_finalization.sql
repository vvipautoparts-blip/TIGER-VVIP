-- VVIP TIGER FUSION — trusted server-side canonical media finalization.
-- The browser may upload only temporary JPEG/WebP derivatives. A separate trusted
-- service must decode and re-encode each object, then attest canonical bytes here.
-- HEIC/HEIF originals remain client-local and are never accepted by this server gate.

begin;

alter table public.vvip_marketplace_listing_media
    add column if not exists finalization_state text not null default 'PENDING_FINALIZATION'
        check (finalization_state in ('PENDING_FINALIZATION', 'PROCESSING', 'CANONICAL', 'FAILED')),
    add column if not exists canonical_storage_path text,
    add column if not exists canonical_sha256 text,
    add column if not exists source_sha256 text,
    add column if not exists canonical_mime_type text,
    add column if not exists canonical_byte_size integer,
    add column if not exists canonical_width integer,
    add column if not exists canonical_height integer,
    add column if not exists canonical_verified_at timestamptz,
    add column if not exists canonical_verifier text,
    add column if not exists finalization_error_code text;

alter table public.vvip_marketplace_listing_media
    add constraint vvip_marketplace_media_canonical_shape_check
    check (
        (
            finalization_state = 'CANONICAL'
            and canonical_storage_path is not null
            and canonical_sha256 ~ '^[0-9a-f]{64}$'
            and source_sha256 ~ '^[0-9a-f]{64}$'
            and canonical_mime_type in ('image/jpeg', 'image/webp')
            and canonical_byte_size between 1 and 10485760
            and canonical_width between 320 and 4096
            and canonical_height between 240 and 4096
            and canonical_verified_at is not null
            and length(canonical_verifier) between 1 and 80
            and finalization_error_code is null
        )
        or (
            finalization_state <> 'CANONICAL'
            and canonical_storage_path is null
            and canonical_sha256 is null
            and canonical_mime_type is null
            and canonical_byte_size is null
            and canonical_width is null
            and canonical_height is null
            and canonical_verified_at is null
            and canonical_verifier is null
        )
    ) not valid;

create unique index if not exists vvip_marketplace_media_canonical_path_unique
    on public.vvip_marketplace_listing_media (canonical_storage_path)
    where canonical_storage_path is not null;

create table public.vvip_media_finalization_jobs (
    job_id uuid primary key default gen_random_uuid(),
    media_id uuid not null
        references public.vvip_marketplace_listing_media(media_id) on delete cascade,
    owner_subject text not null,
    token_hash text not null unique,
    job_state text not null default 'REQUESTED'
        check (job_state in ('REQUESTED', 'PROCESSING', 'COMPLETED', 'FAILED', 'EXPIRED')),
    attempt_count smallint not null default 0 check (attempt_count between 0 and 3),
    expires_at timestamptz not null,
    lease_expires_at timestamptz,
    error_code text,
    created_at timestamptz not null default statement_timestamp(),
    updated_at timestamptz not null default statement_timestamp(),
    completed_at timestamptz,
    check (length(owner_subject) between 1 and 128),
    check (token_hash ~ '^[0-9a-f]{64}$'),
    check (expires_at > created_at),
    check (error_code is null or length(error_code) between 1 and 120),
    check (
        (job_state = 'COMPLETED' and completed_at is not null)
        or (job_state <> 'COMPLETED' and completed_at is null)
    )
);

create unique index vvip_media_finalization_one_live_job
    on public.vvip_media_finalization_jobs (media_id)
    where job_state in ('REQUESTED', 'PROCESSING');

create index vvip_media_finalization_expiry_idx
    on public.vvip_media_finalization_jobs (job_state, expires_at);

create or replace function public.vvip_marketplace_guard_media_write()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $function$
begin
    if current_user in ('anon', 'authenticated') then
        if TG_OP = 'INSERT' then
            if NEW.finalization_state <> 'PENDING_FINALIZATION'
               or NEW.canonical_storage_path is not null
               or NEW.canonical_sha256 is not null
               or NEW.source_sha256 is not null
               or NEW.canonical_mime_type is not null
               or NEW.canonical_byte_size is not null
               or NEW.canonical_width is not null
               or NEW.canonical_height is not null
               or NEW.canonical_verified_at is not null
               or NEW.canonical_verifier is not null
               or NEW.finalization_error_code is not null then
                raise exception 'MARKETPLACE_MEDIA_CANONICAL_FIELDS_TRUSTED_ONLY';
            end if;
        elsif TG_OP = 'UPDATE' then
            if NEW.owner_subject is distinct from OLD.owner_subject
               or NEW.listing_id is distinct from OLD.listing_id
               or NEW.storage_path is distinct from OLD.storage_path
               or NEW.mime_type is distinct from OLD.mime_type
               or NEW.byte_size is distinct from OLD.byte_size
               or NEW.width is distinct from OLD.width
               or NEW.height is distinct from OLD.height
               or NEW.finalization_state is distinct from OLD.finalization_state
               or NEW.canonical_storage_path is distinct from OLD.canonical_storage_path
               or NEW.canonical_sha256 is distinct from OLD.canonical_sha256
               or NEW.source_sha256 is distinct from OLD.source_sha256
               or NEW.canonical_mime_type is distinct from OLD.canonical_mime_type
               or NEW.canonical_byte_size is distinct from OLD.canonical_byte_size
               or NEW.canonical_width is distinct from OLD.canonical_width
               or NEW.canonical_height is distinct from OLD.canonical_height
               or NEW.canonical_verified_at is distinct from OLD.canonical_verified_at
               or NEW.canonical_verifier is distinct from OLD.canonical_verifier
               or NEW.finalization_error_code is distinct from OLD.finalization_error_code then
                raise exception 'MARKETPLACE_MEDIA_CANONICAL_FIELDS_TRUSTED_ONLY';
            end if;
        end if;
    end if;
    return NEW;
end;
$function$;

drop trigger if exists vvip_marketplace_guard_media_write on public.vvip_marketplace_listing_media;
create trigger vvip_marketplace_guard_media_write
before insert or update on public.vvip_marketplace_listing_media
for each row execute function public.vvip_marketplace_guard_media_write();

create or replace function public.vvip_marketplace_require_canonical_media()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $function$
declare
    media_count integer;
    invalid_count integer;
begin
    if NEW.status in ('PENDING_REVIEW', 'ACTIVE')
       and NEW.status is distinct from OLD.status then
        select count(*) into media_count
        from public.vvip_marketplace_listing_media media
        where media.listing_id = NEW.listing_id;

        if media_count < 1 or media_count > 7 then
            raise exception 'MARKETPLACE_MEDIA_COUNT_INVALID';
        end if;

        select count(*) into invalid_count
        from public.vvip_marketplace_listing_media media
        where media.listing_id = NEW.listing_id
          and (
              media.finalization_state <> 'CANONICAL'
              or media.canonical_storage_path is null
              or media.canonical_sha256 !~ '^[0-9a-f]{64}$'
              or media.source_sha256 !~ '^[0-9a-f]{64}$'
              or media.canonical_mime_type not in ('image/jpeg', 'image/webp')
              or media.canonical_byte_size not between 1 and 10485760
              or media.canonical_width not between 320 and 4096
              or media.canonical_height not between 240 and 4096
              or media.canonical_verified_at is null
              or media.canonical_verifier is null
          );

        if invalid_count <> 0 then
            raise exception 'MEDIA_SERVER_FINALIZATION_REQUIRED';
        end if;
    end if;
    return NEW;
end;
$function$;

drop trigger if exists vvip_marketplace_require_canonical_media on public.vvip_marketplace_listings;
create trigger vvip_marketplace_require_canonical_media
before update on public.vvip_marketplace_listings
for each row execute function public.vvip_marketplace_require_canonical_media();

create function public.vvip_marketplace_request_media_finalization(target_media uuid)
returns table (
    media_id uuid,
    finalization_token text,
    expires_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $function$
declare
    actor text := public.vvip_marketplace_actor_id();
    current_media public.vvip_marketplace_listing_media%rowtype;
    listing_status text;
    raw_token text;
    raw_hash text;
    expiry timestamptz := statement_timestamp() + interval '10 minutes';
begin
    if actor is null then
        raise exception 'MARKETPLACE_AUTH_REQUIRED';
    end if;

    select media.* into current_media
    from public.vvip_marketplace_listing_media media
    where media.media_id = target_media
    for update;

    if not found then
        raise exception 'MARKETPLACE_MEDIA_NOT_FOUND';
    end if;
    if current_media.owner_subject <> actor then
        raise exception 'MARKETPLACE_MEDIA_OWNER_REQUIRED';
    end if;
    if current_media.finalization_state = 'CANONICAL' then
        raise exception 'MARKETPLACE_MEDIA_ALREADY_CANONICAL';
    end if;

    select listing.status into listing_status
    from public.vvip_marketplace_listings listing
    where listing.listing_id = current_media.listing_id
      and listing.owner_subject = actor
    for share;

    if listing_status not in ('DRAFT', 'REJECTED') then
        raise exception 'MARKETPLACE_MEDIA_FINALIZATION_STATE_INVALID';
    end if;

    update public.vvip_media_finalization_jobs job
    set job_state = 'EXPIRED', updated_at = statement_timestamp()
    where job.media_id = target_media
      and job.job_state in ('REQUESTED', 'PROCESSING')
      and (
          job.expires_at <= statement_timestamp()
          or (job.job_state = 'PROCESSING' and job.lease_expires_at <= statement_timestamp())
      );

    if exists (
        select 1
        from public.vvip_media_finalization_jobs job
        where job.media_id = target_media
          and job.job_state in ('REQUESTED', 'PROCESSING')
    ) then
        raise exception 'MARKETPLACE_MEDIA_FINALIZATION_ALREADY_PENDING';
    end if;

    raw_token := encode(extensions.gen_random_bytes(32), 'hex');
    raw_hash := encode(extensions.digest(convert_to(raw_token, 'UTF8'), 'sha256'), 'hex');

    insert into public.vvip_media_finalization_jobs (
        media_id, owner_subject, token_hash, job_state, expires_at
    ) values (
        target_media, actor, raw_hash, 'REQUESTED', expiry
    );

    update public.vvip_marketplace_listing_media
    set finalization_state = 'PENDING_FINALIZATION',
        finalization_error_code = null
    where public.vvip_marketplace_listing_media.media_id = target_media;

    return query select target_media, raw_token, expiry;
end;
$function$;

create function public.vvip_marketplace_claim_media_finalization(
    target_media uuid,
    finalization_token text
)
returns table (
    job_id uuid,
    media_id uuid,
    listing_id uuid,
    source_storage_path text,
    expected_mime_type text,
    expected_byte_size integer,
    expected_width integer,
    expected_height integer
)
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $function$
declare
    token_digest text;
    current_job public.vvip_media_finalization_jobs%rowtype;
    current_media public.vvip_marketplace_listing_media%rowtype;
begin
    if finalization_token is null or length(finalization_token) <> 64
       or finalization_token !~ '^[0-9a-f]{64}$' then
        raise exception 'MEDIA_FINALIZATION_TOKEN_INVALID';
    end if;

    token_digest := encode(extensions.digest(convert_to(finalization_token, 'UTF8'), 'sha256'), 'hex');

    select job.* into current_job
    from public.vvip_media_finalization_jobs job
    where job.media_id = target_media
      and job.token_hash = token_digest
      and job.job_state in ('REQUESTED', 'PROCESSING')
    for update;

    if not found then
        raise exception 'MEDIA_FINALIZATION_JOB_NOT_FOUND';
    end if;
    if current_job.expires_at <= statement_timestamp() then
        update public.vvip_media_finalization_jobs
        set job_state = 'EXPIRED', updated_at = statement_timestamp()
        where public.vvip_media_finalization_jobs.job_id = current_job.job_id;
        raise exception 'MEDIA_FINALIZATION_TOKEN_EXPIRED';
    end if;
    if current_job.attempt_count >= 3 then
        raise exception 'MEDIA_FINALIZATION_ATTEMPTS_EXHAUSTED';
    end if;
    if current_job.job_state = 'PROCESSING'
       and current_job.lease_expires_at > statement_timestamp() then
        raise exception 'MEDIA_FINALIZATION_ALREADY_PROCESSING';
    end if;

    select media.* into current_media
    from public.vvip_marketplace_listing_media media
    where media.media_id = target_media
    for update;

    if not found or current_media.owner_subject <> current_job.owner_subject then
        raise exception 'MEDIA_FINALIZATION_BINDING_INVALID';
    end if;
    if current_media.finalization_state = 'CANONICAL' then
        raise exception 'MARKETPLACE_MEDIA_ALREADY_CANONICAL';
    end if;

    update public.vvip_media_finalization_jobs
    set job_state = 'PROCESSING',
        attempt_count = attempt_count + 1,
        lease_expires_at = statement_timestamp() + interval '2 minutes',
        error_code = null,
        updated_at = statement_timestamp()
    where public.vvip_media_finalization_jobs.job_id = current_job.job_id;

    update public.vvip_marketplace_listing_media
    set finalization_state = 'PROCESSING', finalization_error_code = null
    where public.vvip_marketplace_listing_media.media_id = target_media;

    return query
    select
        current_job.job_id,
        current_media.media_id,
        current_media.listing_id,
        current_media.storage_path,
        current_media.mime_type,
        current_media.byte_size,
        current_media.width,
        current_media.height;
end;
$function$;

create function public.vvip_marketplace_complete_media_finalization(
    target_job uuid,
    finalization_token text,
    source_digest text,
    canonical_path text,
    canonical_digest text,
    canonical_mime text,
    canonical_size integer,
    canonical_image_width integer,
    canonical_image_height integer,
    verifier_id text
)
returns table (
    media_id uuid,
    finalization_state text,
    canonical_storage_path text,
    canonical_sha256 text
)
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $function$
declare
    token_digest text;
    current_job public.vvip_media_finalization_jobs%rowtype;
    current_media public.vvip_marketplace_listing_media%rowtype;
    expected_path text;
    extension text;
begin
    if finalization_token is null or length(finalization_token) <> 64
       or finalization_token !~ '^[0-9a-f]{64}$' then
        raise exception 'MEDIA_FINALIZATION_TOKEN_INVALID';
    end if;
    if source_digest !~ '^[0-9a-f]{64}$' or canonical_digest !~ '^[0-9a-f]{64}$' then
        raise exception 'MEDIA_FINALIZATION_DIGEST_INVALID';
    end if;
    if canonical_mime not in ('image/jpeg', 'image/webp') then
        raise exception 'MEDIA_FINALIZATION_MIME_INVALID';
    end if;
    if canonical_size not between 1 and 10485760
       or canonical_image_width not between 320 and 4096
       or canonical_image_height not between 240 and 4096 then
        raise exception 'MEDIA_FINALIZATION_GEOMETRY_INVALID';
    end if;
    if verifier_id is null or length(verifier_id) not between 1 and 80 then
        raise exception 'MEDIA_FINALIZATION_VERIFIER_INVALID';
    end if;

    token_digest := encode(extensions.digest(convert_to(finalization_token, 'UTF8'), 'sha256'), 'hex');

    select job.* into current_job
    from public.vvip_media_finalization_jobs job
    where job.job_id = target_job
      and job.token_hash = token_digest
      and job.job_state = 'PROCESSING'
    for update;

    if not found then
        raise exception 'MEDIA_FINALIZATION_JOB_NOT_PROCESSING';
    end if;
    if current_job.expires_at <= statement_timestamp()
       or current_job.lease_expires_at <= statement_timestamp() then
        raise exception 'MEDIA_FINALIZATION_LEASE_EXPIRED';
    end if;

    select media.* into current_media
    from public.vvip_marketplace_listing_media media
    where media.media_id = current_job.media_id
    for update;

    if not found or current_media.owner_subject <> current_job.owner_subject then
        raise exception 'MEDIA_FINALIZATION_BINDING_INVALID';
    end if;

    extension := case canonical_mime when 'image/jpeg' then '.jpg' else '.webp' end;
    expected_path := current_media.listing_id::text || '/' || current_media.media_id::text || '/' || canonical_digest || extension;
    if canonical_path <> expected_path then
        raise exception 'MEDIA_FINALIZATION_CANONICAL_PATH_INVALID';
    end if;

    update public.vvip_marketplace_listing_media
    set finalization_state = 'CANONICAL',
        source_sha256 = source_digest,
        canonical_storage_path = canonical_path,
        canonical_sha256 = canonical_digest,
        canonical_mime_type = canonical_mime,
        canonical_byte_size = canonical_size,
        canonical_width = canonical_image_width,
        canonical_height = canonical_image_height,
        canonical_verified_at = statement_timestamp(),
        canonical_verifier = verifier_id,
        finalization_error_code = null
    where public.vvip_marketplace_listing_media.media_id = current_media.media_id;

    update public.vvip_media_finalization_jobs
    set job_state = 'COMPLETED',
        completed_at = statement_timestamp(),
        lease_expires_at = null,
        error_code = null,
        updated_at = statement_timestamp()
    where public.vvip_media_finalization_jobs.job_id = current_job.job_id;

    return query
    select current_media.media_id, 'CANONICAL'::text, canonical_path, canonical_digest;
end;
$function$;

create function public.vvip_marketplace_fail_media_finalization(
    target_job uuid,
    finalization_token text,
    failure_code text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $function$
declare
    token_digest text;
    current_job public.vvip_media_finalization_jobs%rowtype;
    safe_code text;
begin
    if finalization_token is null or length(finalization_token) <> 64
       or finalization_token !~ '^[0-9a-f]{64}$' then
        raise exception 'MEDIA_FINALIZATION_TOKEN_INVALID';
    end if;
    safe_code := left(regexp_replace(coalesce(failure_code, 'MEDIA_FINALIZATION_FAILED'), '[^A-Z0-9_]', '_', 'g'), 120);
    token_digest := encode(extensions.digest(convert_to(finalization_token, 'UTF8'), 'sha256'), 'hex');

    select job.* into current_job
    from public.vvip_media_finalization_jobs job
    where job.job_id = target_job
      and job.token_hash = token_digest
      and job.job_state = 'PROCESSING'
    for update;

    if not found then
        return;
    end if;

    update public.vvip_media_finalization_jobs
    set job_state = 'FAILED',
        lease_expires_at = null,
        error_code = safe_code,
        updated_at = statement_timestamp()
    where public.vvip_media_finalization_jobs.job_id = current_job.job_id;

    update public.vvip_marketplace_listing_media
    set finalization_state = 'FAILED', finalization_error_code = safe_code
    where public.vvip_marketplace_listing_media.media_id = current_job.media_id
      and finalization_state <> 'CANONICAL';
end;
$function$;

alter table public.vvip_media_finalization_jobs enable row level security;
alter table public.vvip_media_finalization_jobs force row level security;

revoke all privileges on table public.vvip_media_finalization_jobs from public, anon, authenticated;
grant all privileges on table public.vvip_media_finalization_jobs to service_role;

revoke all on function public.vvip_marketplace_request_media_finalization(uuid) from public, anon;
grant execute on function public.vvip_marketplace_request_media_finalization(uuid) to authenticated;

revoke all on function public.vvip_marketplace_claim_media_finalization(uuid, text) from public, anon, authenticated;
grant execute on function public.vvip_marketplace_claim_media_finalization(uuid, text) to service_role;

revoke all on function public.vvip_marketplace_complete_media_finalization(uuid, text, text, text, text, text, integer, integer, integer, text) from public, anon, authenticated;
grant execute on function public.vvip_marketplace_complete_media_finalization(uuid, text, text, text, text, text, integer, integer, integer, text) to service_role;

revoke all on function public.vvip_marketplace_fail_media_finalization(uuid, text, text) from public, anon, authenticated;
grant execute on function public.vvip_marketplace_fail_media_finalization(uuid, text, text) to service_role;

revoke all on function public.vvip_marketplace_guard_media_write() from public, anon, authenticated;
revoke all on function public.vvip_marketplace_require_canonical_media() from public, anon, authenticated;

grant execute on function public.vvip_marketplace_guard_media_write() to service_role;
grant execute on function public.vvip_marketplace_require_canonical_media() to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'listing-media-canonical',
    'listing-media-canonical',
    false,
    10485760,
    array['image/jpeg', 'image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

update storage.buckets
set allowed_mime_types = array['image/jpeg', 'image/webp']
where id = 'listing-media';

drop policy if exists vvip_listing_media_storage_owner_insert on storage.objects;
create policy vvip_listing_media_storage_owner_insert
on storage.objects
for insert
to authenticated
with check (
    bucket_id = 'listing-media'
    and (storage.foldername(name))[1] = public.vvip_marketplace_actor_id()
    and lower(storage.extension(name)) in ('jpg', 'jpeg', 'webp')
);

drop policy if exists vvip_listing_media_storage_read on storage.objects;
drop policy if exists vvip_listing_media_raw_owner_read on storage.objects;
create policy vvip_listing_media_raw_owner_read
on storage.objects
for select
to authenticated
using (
    bucket_id = 'listing-media'
    and (storage.foldername(name))[1] = public.vvip_marketplace_actor_id()
);

drop policy if exists vvip_listing_media_canonical_read on storage.objects;
create policy vvip_listing_media_canonical_read
on storage.objects
for select
to anon, authenticated
using (
    bucket_id = 'listing-media-canonical'
    and exists (
        select 1
        from public.vvip_marketplace_listing_media media
        join public.vvip_marketplace_listings listing
          on listing.listing_id = media.listing_id
        where media.canonical_storage_path = storage.objects.name
          and media.finalization_state = 'CANONICAL'
          and (
              media.owner_subject = public.vvip_marketplace_actor_id()
              or (
                  listing.status = 'ACTIVE'
                  and vvip_private.vvip_marketplace_country_is_active(listing.active_market_country)
              )
          )
    )
);

commit;