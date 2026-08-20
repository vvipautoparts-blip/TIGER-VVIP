-- VVIP TIGER Gate 2 hardening: atomically bind canonical READY to the claimed
-- webhook event and replace unbounded quarantine expiration with bounded,
-- concurrent-safe batches. Repository/local-rehearsal only.

begin;

-- The earlier byte-fact commit function remains an internal building block,
-- but direct service-role execution is removed. Success must flow through the
-- event-bound wrapper below so media/passport/event state share one transaction.
revoke all on function public.vvip_social_media_finalize(
    uuid, text, text, integer, integer, integer,
    text, text, integer, text, integer, integer, text, text
) from public, anon, authenticated, service_role;

create function public.vvip_social_media_finalize_event(
    target_event uuid,
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
    v_event public.vvip_social_media_webhook_inbox%rowtype;
    v_path text;
begin
    if target_event is null or target_media is null then
        raise exception 'SOCIAL_MEDIA_FINALIZE_TARGET_REQUIRED';
    end if;

    select inbox.* into v_event
    from public.vvip_social_media_webhook_inbox inbox
    where inbox.event_id = target_event
    for update;

    if not found then
        raise exception 'SOCIAL_MEDIA_FINALIZE_EVENT_NOT_FOUND';
    end if;
    if v_event.media_id <> target_media then
        raise exception 'SOCIAL_MEDIA_FINALIZE_EVENT_MEDIA_MISMATCH';
    end if;

    -- Network retry after a committed response is idempotent: the underlying
    -- byte-fact function validates source/canonical digests against READY.
    if v_event.event_state = 'completed' then
        select public.vvip_social_media_finalize(
            target_media,
            source_digest,
            source_mime,
            source_size,
            source_image_width,
            source_image_height,
            canonical_path,
            canonical_digest,
            canonical_size,
            canonical_mime,
            canonical_image_width,
            canonical_image_height,
            verifier_id,
            verifier_build_version
        ) into v_path;
        return v_path;
    end if;

    if v_event.event_state <> 'processing' then
        raise exception 'SOCIAL_MEDIA_FINALIZE_EVENT_STATE_INVALID';
    end if;

    select public.vvip_social_media_finalize(
        target_media,
        source_digest,
        source_mime,
        source_size,
        source_image_width,
        source_image_height,
        canonical_path,
        canonical_digest,
        canonical_size,
        canonical_mime,
        canonical_image_width,
        canonical_image_height,
        verifier_id,
        verifier_build_version
    ) into v_path;

    update public.vvip_social_media_webhook_inbox
    set event_state = 'completed',
        completed_at = statement_timestamp(),
        locked_at = null,
        last_error_code = null,
        updated_at = statement_timestamp()
    where event_id = target_event
      and media_id = target_media
      and event_state = 'processing';

    if not found then
        -- Raising here rolls back the READY transition and passport insertion
        -- performed by vvip_social_media_finalize in this same RPC transaction.
        raise exception 'SOCIAL_MEDIA_FINALIZE_EVENT_ATOMICITY_FAILED';
    end if;

    return v_path;
end;
$function$;

revoke all on function public.vvip_social_media_finalize_event(
    uuid, uuid, text, text, integer, integer, integer,
    text, text, integer, text, integer, integer, text, text
) from public, anon, authenticated, service_role;
grant execute on function public.vvip_social_media_finalize_event(
    uuid, uuid, text, text, integer, integer, integer,
    text, text, integer, text, integer, integer, text, text
) to service_role;

-- Replace the legacy unbounded cleanup function with an explicitly bounded
-- batch capability. SKIP LOCKED lets multiple trusted sweepers cooperate
-- without duplicate cleanup work or head-of-line blocking.
revoke all on function public.vvip_social_media_expire_quarantine()
    from public, anon, authenticated, service_role;
drop function if exists public.vvip_social_media_expire_quarantine();

create function public.vvip_social_media_expire_quarantine(max_rows integer default 100)
returns table (
    media_id uuid,
    quarantine_storage_path text
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
begin
    if max_rows not between 1 and 500 then
        raise exception 'SOCIAL_MEDIA_QUARANTINE_BATCH_INVALID';
    end if;

    return query
    with candidates as (
        select asset.media_id
        from public.vvip_social_media_assets asset
        where asset.media_state in ('reserved', 'quarantined')
          and asset.upload_lease_expires_at <= statement_timestamp()
        order by asset.upload_lease_expires_at, asset.media_id
        for update skip locked
        limit max_rows
    ), expired_rows as (
        update public.vvip_social_media_assets asset
        set media_state = 'expired',
            failure_code = 'SOCIAL_MEDIA_UPLOAD_LEASE_EXPIRED',
            updated_at = statement_timestamp()
        from candidates candidate
        where asset.media_id = candidate.media_id
        returning asset.media_id, asset.quarantine_storage_path
    )
    select expired_rows.media_id, expired_rows.quarantine_storage_path
    from expired_rows;
end;
$function$;

revoke all on function public.vvip_social_media_expire_quarantine(integer)
    from public, anon, authenticated, service_role;
grant execute on function public.vvip_social_media_expire_quarantine(integer)
    to service_role;

comment on function public.vvip_social_media_finalize_event(
    uuid, uuid, text, text, integer, integer, integer,
    text, text, integer, text, integer, integer, text, text
) is
    'Service-only atomic Gate 2 success boundary: canonical READY + immutable passport + exact claimed webhook completion.';
comment on function public.vvip_social_media_expire_quarantine(integer) is
    'Service-only bounded SKIP LOCKED sweeper for expired quarantine leases; returns storage paths for compensating deletion.';

commit;
