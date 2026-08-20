-- VVIP TIGER Gate 2 — durable worker wake-up path.
-- The durable source of truth remains vvip_social_media_webhook_inbox. This job
-- only wakes the trusted finalizer when due work exists; retries/backoff/DLQ stay
-- transactionally owned by PostgreSQL. Runtime URL/secret are provisioned outside
-- Git in Supabase Vault and are never embedded in this migration.

begin;

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;
create extension if not exists supabase_vault with schema vault;

create function public.vvip_social_media_dispatch_worker()
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
begin
    -- Do no networking when there is nothing due. The inbox remains the sole
    -- durable retry clock and concurrent workers still claim via SKIP LOCKED.
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

    -- Missing runtime activation is fail-closed but intentionally quiet so local
    -- resets and pre-activation environments do not create noisy failing cron runs.
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

comment on function public.vvip_social_media_dispatch_worker() is
    'Gate 2 owner-only cron dispatcher. Wakes the trusted finalizer using Vault-scoped runtime secrets only when a durable pending event is due.';

-- pg_cron supports second-based intervals on current Supabase/Postgres versions.
-- Reusing the same job name is deterministic on replay; the migration itself is
-- forward-only and is exercised from a clean local database before review.
select cron.schedule(
    'tiger-social-media-finalizer-dispatch',
    '5 seconds',
    $cron$select public.vvip_social_media_dispatch_worker();$cron$
);

commit;
