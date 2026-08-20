-- TIGER Gate 4 notification worker HMAC replay authority.
-- Forward-only local/repository migration. Production application is not authorized here.

begin;

create table public.vvip_notification_worker_nonces (
    nonce text primary key,
    challenge_timestamp bigint not null,
    consumed_at timestamptz not null default statement_timestamp(),
    check (nonce ~ '^[0-9a-f]{32}$')
);

create index vvip_notification_worker_nonces_consumed_idx
    on public.vvip_notification_worker_nonces (consumed_at);

alter table public.vvip_notification_worker_nonces enable row level security;
alter table public.vvip_notification_worker_nonces force row level security;
revoke all privileges on table public.vvip_notification_worker_nonces from public, anon, authenticated;
grant select, insert, delete on table public.vvip_notification_worker_nonces to service_role;

create or replace function public.vvip_notification_consume_worker_challenge(
    challenge_nonce text,
    challenge_timestamp bigint
)
returns boolean
language plpgsql
security definer set search_path = pg_catalog, public
as $function$
declare
    v_now bigint := extract(epoch from statement_timestamp())::bigint;
    v_inserted integer := 0;
begin
    if challenge_nonce is null or challenge_nonce !~ '^[0-9a-f]{32}$' then
        return false;
    end if;
    if challenge_timestamp is null or abs(v_now - challenge_timestamp) > 60 then
        return false;
    end if;

    -- Bounded retention keeps replay memory finite while exceeding the accepted 60s window.
    delete from public.vvip_notification_worker_nonces where consumed_at < statement_timestamp() - interval '1 hour';

    insert into public.vvip_notification_worker_nonces (nonce, challenge_timestamp)
    values (challenge_nonce, challenge_timestamp)
    on conflict (nonce) do nothing;
    get diagnostics v_inserted = row_count;

    return v_inserted = 1;
end;
$function$;

revoke all on function public.vvip_notification_consume_worker_challenge(text,bigint)
    from public, anon, authenticated;
grant execute on function public.vvip_notification_consume_worker_challenge(text,bigint)
    to service_role;

comment on table public.vvip_notification_worker_nonces is
    'Gate 4 one-time HMAC worker nonce memory. A nonce is accepted at most once inside the 60-second challenge window.';

commit;
