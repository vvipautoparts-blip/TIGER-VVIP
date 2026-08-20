-- VVIP TIGER Gate 2 — HMAC worker wake-up boundary + one-time replay fence.
-- The Vault worker secret never crosses the HTTP boundary. PostgreSQL signs a
-- short-lived challenge, while the trusted finalizer verifies the HMAC and then
-- atomically consumes the nonce before any media work can begin.

begin;

create extension if not exists pgcrypto with schema extensions;

create table public.vvip_social_media_worker_challenges (
    nonce text primary key,
    issued_at_epoch bigint not null,
    expires_at timestamptz not null,
    consumed_at timestamptz,
    created_at timestamptz not null default statement_timestamp(),
    check (nonce ~ '^[0-9a-f]{32}$'),
    check (issued_at_epoch > 0),
    check (expires_at > created_at)
);

create index vvip_social_media_worker_challenges_expiry_idx
    on public.vvip_social_media_worker_challenges (expires_at, nonce)
    where consumed_at is null;

alter table public.vvip_social_media_worker_challenges enable row level security;
alter table public.vvip_social_media_worker_challenges force row level security;
revoke all privileges on table public.vvip_social_media_worker_challenges
    from public, anon, authenticated, service_role;

create function public.vvip_social_media_consume_worker_challenge(
    challenge_nonce text,
    challenge_timestamp bigint
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
set lock_timeout = '1s'
set statement_timeout = '2s'
as $function$
declare
    v_consumed_nonce text;
begin
    if challenge_nonce is null or challenge_nonce !~ '^[0-9a-f]{32}$' then
        return false;
    end if;
    if challenge_timestamp is null or challenge_timestamp <= 0 then
        return false;
    end if;

    update public.vvip_social_media_worker_challenges challenge
    set consumed_at = statement_timestamp()
    where challenge.nonce = challenge_nonce
      and challenge.issued_at_epoch = challenge_timestamp
      and challenge.consumed_at is null
      and challenge.expires_at >= statement_timestamp()
    returning challenge.nonce into v_consumed_nonce;

    return v_consumed_nonce is not null;
end;
$function$;

revoke all on function public.vvip_social_media_consume_worker_challenge(text, bigint)
    from public, anon, authenticated, service_role;
grant execute on function public.vvip_social_media_consume_worker_challenge(text, bigint)
    to service_role;

create or replace function public.vvip_social_media_dispatch_worker()
returns bigint
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
set statement_timeout = '3s'
as $function$
declare
    v_worker_url text;
    v_worker_secret text;
    v_request_id bigint;
    v_recovered_pending integer;
    v_recovered_dead integer;
    v_timestamp bigint;
    v_nonce text;
    v_message text;
    v_signature text;
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

    if v_worker_url !~ '^https://[a-z0-9-]+\.supabase\.co/functions/v1/social-media-finalizer$' then
        raise exception 'SOCIAL_MEDIA_WORKER_URL_INVALID';
    end if;
    if length(v_worker_secret) < 32 or length(v_worker_secret) > 512 then
        raise exception 'SOCIAL_MEDIA_WORKER_SECRET_INVALID';
    end if;

    -- Bounded cleanup prevents the replay-fence table from growing forever while
    -- avoiding an unbounded delete after a long outage.
    with expired as (
        select challenge.nonce
        from public.vvip_social_media_worker_challenges challenge
        where challenge.expires_at < statement_timestamp() - interval '5 minutes'
        order by challenge.expires_at, challenge.nonce
        for update skip locked
        limit 256
    )
    delete from public.vvip_social_media_worker_challenges challenge using expired where challenge.nonce = expired.nonce;

    v_timestamp := floor(extract(epoch from statement_timestamp()))::bigint;
    v_nonce := encode(extensions.gen_random_bytes(16), 'hex');
    v_message := 'tiger-media-worker-v1' || chr(10)
        || v_timestamp::text || chr(10)
        || v_nonce || chr(10)
        || 'POST' || chr(10)
        || '/functions/v1/social-media-finalizer';
    v_signature := encode(
        extensions.hmac(
            convert_to(v_message, 'UTF8'),
            convert_to(v_worker_secret, 'UTF8'),
            'sha256'
        ),
        'hex'
    );

    insert into public.vvip_social_media_worker_challenges (
        nonce,
        issued_at_epoch,
        expires_at
    ) values (
        v_nonce,
        v_timestamp,
        statement_timestamp() + interval '90 seconds'
    );

    select net.http_post(
        url := v_worker_url,
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'x-tiger-worker-signature', v_signature,
            'x-tiger-worker-timestamp', v_timestamp::text,
            'x-tiger-worker-nonce', v_nonce
        ),
        body := '{}'::jsonb,
        timeout_milliseconds := 2500
    ) into v_request_id;

    return v_request_id;
end;
$function$;

revoke all on function public.vvip_social_media_dispatch_worker()
    from public, anon, authenticated, service_role;

comment on table public.vvip_social_media_worker_challenges is
    'Gate 2 private one-time HMAC challenge ledger. Direct browser/service table access is closed; nonce consumption occurs only through the service-only RPC.';
comment on function public.vvip_social_media_consume_worker_challenge(text, bigint) is
    'Service-only atomic replay fence for a verified short-lived worker HMAC challenge.';
comment on function public.vvip_social_media_dispatch_worker() is
    'Postgres/cron-only worker wakeup: Supabase-host-pinned HTTPS plus HMAC SHA-256 timestamp/nonce challenge; raw Vault secret never crosses HTTP.';

commit;
