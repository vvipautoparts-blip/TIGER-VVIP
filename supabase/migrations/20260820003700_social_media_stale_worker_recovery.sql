-- VVIP TIGER Gate 2 — stale worker recovery + claim-generation fencing.
-- A hard-killed Edge worker must never leave an event permanently in processing,
-- and a recovered older worker must never be able to finalize/fail a newer claim.

begin;

-- Internal recovery primitive. It is intentionally not executable by browser or
-- service_role callers; the postgres-owned cron dispatcher invokes it before deciding
-- whether a worker wake-up is required.
create function public.vvip_social_media_recover_stale_processing(max_rows integer default 100)
returns table (
    recovered_pending integer,
    recovered_dead_letter integer
)
language plpgsql
security definer
set search_path = pg_catalog, public
set lock_timeout = '2s'
set statement_timeout = '3s'
as $function$
declare
    v_event public.vvip_social_media_webhook_inbox%rowtype;
    v_pending integer := 0;
    v_dead integer := 0;
begin
    if max_rows not between 1 and 500 then
        raise exception 'SOCIAL_MEDIA_STALE_RECOVERY_BATCH_INVALID';
    end if;

    for v_event in
        select inbox.*
        from public.vvip_social_media_webhook_inbox inbox
        where inbox.event_state = 'processing'
          and inbox.locked_at is not null
          and inbox.locked_at <= statement_timestamp() - interval '5 minutes'
        order by inbox.locked_at, inbox.event_id
        for update skip locked
        limit max_rows
    loop
        if v_event.attempt_count >= 5 then
            update public.vvip_social_media_webhook_inbox inbox
            set event_state = 'dead_letter',
                locked_at = null,
                last_error_code = 'SOCIAL_MEDIA_WORKER_LEASE_EXPIRED',
                updated_at = statement_timestamp()
            where inbox.event_id = v_event.event_id
              and inbox.event_state = 'processing'
              and inbox.attempt_count = v_event.attempt_count;

            if found then
                update public.vvip_social_media_assets asset
                set media_state = 'failed',
                    failure_code = 'SOCIAL_MEDIA_WORKER_LEASE_EXPIRED',
                    updated_at = statement_timestamp()
                where asset.media_id = v_event.media_id
                  and asset.media_state <> 'ready';
                v_dead := v_dead + 1;
            end if;
        else
            update public.vvip_social_media_webhook_inbox inbox
            set event_state = 'pending',
                next_attempt_at = statement_timestamp(),
                locked_at = null,
                last_error_code = 'SOCIAL_MEDIA_WORKER_LEASE_EXPIRED',
                updated_at = statement_timestamp()
            where inbox.event_id = v_event.event_id
              and inbox.event_state = 'processing'
              and inbox.attempt_count = v_event.attempt_count;

            if found then
                update public.vvip_social_media_assets asset
                set media_state = 'quarantined',
                    failure_code = 'SOCIAL_MEDIA_WORKER_LEASE_EXPIRED',
                    updated_at = statement_timestamp()
                where asset.media_id = v_event.media_id
                  and asset.media_state <> 'ready';
                v_pending := v_pending + 1;
            end if;
        end if;
    end loop;

    return query select v_pending, v_dead;
end;
$function$;

revoke all on function public.vvip_social_media_recover_stale_processing(integer)
    from public, anon, authenticated, service_role;

-- Replace the atomic completion RPC with an attempt-fenced signature. The claim's
-- monotonic attempt_count is the generation token: once recovery + reclaim advances
-- it, an older worker can no longer commit the newer generation.
revoke all on function public.vvip_social_media_finalize_event(
    uuid, uuid, text, text, integer, integer, integer,
    text, text, integer, text, integer, integer, text, text
) from public, anon, authenticated, service_role;

drop function public.vvip_social_media_finalize_event(
    uuid, uuid, text, text, integer, integer, integer,
    text, text, integer, text, integer, integer, text, text
);

create function public.vvip_social_media_finalize_event(
    target_event uuid,
    target_media uuid,
    expected_attempt_count smallint,
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
set lock_timeout = '2s'
as $function$
declare
    v_event public.vvip_social_media_webhook_inbox%rowtype;
    v_path text;
begin
    if target_event is null or target_media is null then
        raise exception 'SOCIAL_MEDIA_FINALIZE_TARGET_REQUIRED';
    end if;
    if expected_attempt_count not between 1 and 5 then
        raise exception 'SOCIAL_MEDIA_WORKER_ATTEMPT_INVALID';
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
    if v_event.attempt_count <> expected_attempt_count then
        raise exception 'SOCIAL_MEDIA_WORKER_CLAIM_STALE';
    end if;

    -- Retry of the same already-committed generation remains idempotent.
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

    update public.vvip_social_media_webhook_inbox inbox
    set event_state = 'completed',
        completed_at = statement_timestamp(),
        locked_at = null,
        last_error_code = null,
        updated_at = statement_timestamp()
    where inbox.event_id = target_event
      and inbox.media_id = target_media
      and inbox.event_state = 'processing'
      and inbox.attempt_count = expected_attempt_count;

    if not found then
        raise exception 'SOCIAL_MEDIA_FINALIZE_EVENT_ATOMICITY_FAILED';
    end if;

    return v_path;
end;
$function$;

revoke all on function public.vvip_social_media_finalize_event(
    uuid, uuid, smallint, text, text, integer, integer, integer,
    text, text, integer, text, integer, integer, text, text
) from public, anon, authenticated, service_role;
grant execute on function public.vvip_social_media_finalize_event(
    uuid, uuid, smallint, text, text, integer, integer, integer,
    text, text, integer, text, integer, integer, text, text
) to service_role;

-- Replace failure recording with the same claim-generation fence.
revoke all on function public.vvip_social_media_webhook_fail(uuid, text)
    from public, anon, authenticated, service_role;
drop function public.vvip_social_media_webhook_fail(uuid, text);

create function public.vvip_social_media_webhook_fail(
    target_event uuid,
    expected_attempt_count smallint,
    error_code text
)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public
set lock_timeout = '2s'
as $function$
declare
    v_event public.vvip_social_media_webhook_inbox%rowtype;
    v_attempts smallint;
    v_delay interval;
    v_error text := left(upper(regexp_replace(coalesce(error_code, 'WORKER_FAILURE'), '[^A-Z0-9_:-]', '_', 'g')), 120);
begin
    if expected_attempt_count not between 1 and 5 then
        raise exception 'SOCIAL_MEDIA_WORKER_ATTEMPT_INVALID';
    end if;

    select inbox.* into v_event
    from public.vvip_social_media_webhook_inbox inbox
    where inbox.event_id = target_event
    for update;

    if not found or v_event.event_state <> 'processing' then
        raise exception 'SOCIAL_MEDIA_WEBHOOK_FAIL_STATE_INVALID';
    end if;
    if v_event.attempt_count <> expected_attempt_count then
        raise exception 'SOCIAL_MEDIA_WORKER_CLAIM_STALE';
    end if;

    v_attempts := v_event.attempt_count;

    if v_attempts >= 5 then
        update public.vvip_social_media_webhook_inbox inbox
        set event_state = 'dead_letter',
            locked_at = null,
            last_error_code = v_error,
            updated_at = statement_timestamp()
        where inbox.event_id = target_event
          and inbox.event_state = 'processing'
          and inbox.attempt_count = expected_attempt_count;

        update public.vvip_social_media_assets asset
        set media_state = 'failed',
            failure_code = v_error,
            updated_at = statement_timestamp()
        where asset.media_id = v_event.media_id
          and asset.media_state <> 'ready';

        return 'dead_letter';
    end if;

    v_delay := (
        case v_attempts
            when 1 then interval '30 seconds'
            when 2 then interval '2 minutes'
            when 3 then interval '8 minutes'
            when 4 then interval '32 minutes'
            else interval '32 minutes'
        end
    ) * (0.85 + random() * 0.30);

    update public.vvip_social_media_webhook_inbox inbox
    set event_state = 'pending',
        next_attempt_at = statement_timestamp() + v_delay,
        locked_at = null,
        last_error_code = v_error,
        updated_at = statement_timestamp()
    where inbox.event_id = target_event
      and inbox.event_state = 'processing'
      and inbox.attempt_count = expected_attempt_count;

    if not found then
        raise exception 'SOCIAL_MEDIA_WORKER_CLAIM_STALE';
    end if;

    update public.vvip_social_media_assets asset
    set media_state = 'quarantined',
        failure_code = v_error,
        updated_at = statement_timestamp()
    where asset.media_id = v_event.media_id
      and asset.media_state <> 'ready';

    return 'pending';
end;
$function$;

revoke all on function public.vvip_social_media_webhook_fail(uuid, smallint, text)
    from public, anon, authenticated, service_role;
grant execute on function public.vvip_social_media_webhook_fail(uuid, smallint, text)
    to service_role;

-- The old non-atomic completion surface must not bypass generation fencing.
revoke all on function public.vvip_social_media_webhook_complete(uuid)
    from public, anon, authenticated, service_role;

-- Upgrade the dispatcher: recovery happens before the pending-work decision, so a
-- queue containing only stale processing rows still self-heals without a browser ping.
create or replace function public.vvip_social_media_dispatch_worker()
returns bigint
language plpgsql
security definer
set search_path = pg_catalog, public
set statement_timeout = '3s'
as $function$
declare
    v_worker_url text;
    v_worker_secret text;
    v_request_id bigint;
    v_recovered_pending integer;
    v_recovered_dead integer;
begin
    select recovered.recovered_pending, recovered.recovered_dead_letter
    into v_recovered_pending, v_recovered_dead
    from public.vvip_social_media_recover_stale_processing(100) recovered;

    if not exists (
        select 1
        from public.vvip_social_media_webhook_inbox inbox
        where inbox.event_state = 'pending'
          and inbox.next_attempt_at <= statement_timestamp()
        limit 1
    ) then
        return null;
    end if;

    select secret.decrypted_secret
    into v_worker_url
    from vault.decrypted_secrets secret
    where secret.name = 'tiger_social_media_worker_url'
    order by secret.updated_at desc, secret.created_at desc
    limit 1;

    select secret.decrypted_secret
    into v_worker_secret
    from vault.decrypted_secrets secret
    where secret.name = 'tiger_media_worker_secret'
    order by secret.updated_at desc, secret.created_at desc
    limit 1;

    if v_worker_url is null or v_worker_secret is null then
        return null;
    end if;

    if v_worker_url !~ '^https://.*/functions/v1/social-media-finalizer$' then
        raise exception 'SOCIAL_MEDIA_WORKER_URL_INVALID';
    end if;
    if length(v_worker_secret) < 32 or length(v_worker_secret) > 512 then
        raise exception 'SOCIAL_MEDIA_WORKER_SECRET_INVALID';
    end if;

    select net.http_post(
        url := v_worker_url,
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'x-tiger-worker-secret', v_worker_secret
        ),
        body := '{}'::jsonb,
        timeout_milliseconds := 2500
    ) into v_request_id;

    return v_request_id;
end;
$function$;

revoke all on function public.vvip_social_media_dispatch_worker()
    from public, anon, authenticated, service_role;

comment on function public.vvip_social_media_recover_stale_processing(integer) is
    'Postgres/cron-only bounded recovery for worker claims abandoned beyond five minutes; attempt generation fences reject recovered stale workers.';
comment on function public.vvip_social_media_finalize_event(
    uuid, uuid, smallint, text, text, integer, integer, integer,
    text, text, integer, text, integer, integer, text, text
) is
    'Service-only atomic Gate 2 completion fenced to the exact webhook claim attempt generation.';
comment on function public.vvip_social_media_webhook_fail(uuid, smallint, text) is
    'Service-only retry/DLQ transition fenced to the exact webhook claim attempt generation.';

commit;
