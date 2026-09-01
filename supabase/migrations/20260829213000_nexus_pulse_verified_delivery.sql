-- TIGER NEXUS 2026 — Pulse Vault / ProofView verified-delivery ledger.
-- Forward-only repository migration. Production application remains separately gated.
-- Product value does not expire by time. Reservation lease_expires_at is a technical
-- concurrency/anti-replay TTL only and never expires purchased Pulse value.

begin;

create table public.vvip_pulse_grants (
    grant_id uuid primary key default gen_random_uuid(),
    owner_subject text not null,
    level text not null check (level in ('PULSE_2', 'PULSE_10', 'PULSE_25', 'PULSE_45')),
    granted_units bigint not null check (granted_units > 0),
    purchase_reference text not null unique,
    country_code text not null check (country_code ~ '^[A-Z]{2}$'),
    status text not null default 'ACTIVE' check (status in ('ACTIVE', 'VOID', 'REFUNDED')),
    created_at timestamptz not null default statement_timestamp(),
    check (owner_subject ~ '^user_[A-Za-z0-9_-]{6,128}$')
);

create table public.vvip_pulse_allocations (
    allocation_id uuid primary key default gen_random_uuid(),
    allocation_group_id uuid not null,
    grant_id uuid not null references public.vvip_pulse_grants(grant_id) on delete restrict,
    owner_subject text not null,
    post_id uuid not null references public.vvip_social_posts(post_id) on delete restrict,
    mode text not null check (mode in ('NOW', 'SMART', 'PRECISE')),
    allocation_units bigint not null check (allocation_units > 0),
    consumed_units bigint not null default 0 check (consumed_units >= 0),
    released_units bigint not null default 0 check (released_units >= 0),
    state text not null default 'ACTIVE' check (state in ('ACTIVE', 'PAUSED', 'DEPLETED')),
    auto_frozen boolean not null default false,
    opportunity_state text not null default 'BALANCED' check (opportunity_state in ('LOW', 'BALANCED', 'STRONG', 'FROZEN')),
    opportunity_reason text,
    request_key text not null,
    created_at timestamptz not null default statement_timestamp(),
    updated_at timestamptz not null default statement_timestamp(),
    check (owner_subject ~ '^user_[A-Za-z0-9_-]{6,128}$'),
    check (consumed_units + released_units <= allocation_units),
    unique (owner_subject, request_key, grant_id)
);

create index vvip_pulse_allocations_owner_group_idx
    on public.vvip_pulse_allocations(owner_subject, allocation_group_id, created_at);
create index vvip_pulse_allocations_grant_idx
    on public.vvip_pulse_allocations(grant_id, state);
create index vvip_pulse_allocations_post_idx
    on public.vvip_pulse_allocations(post_id, state);

create table public.vvip_pulse_reservations (
    reservation_id uuid primary key default gen_random_uuid(),
    allocation_id uuid not null references public.vvip_pulse_allocations(allocation_id) on delete restrict,
    owner_subject text not null,
    viewer_hash text not null check (viewer_hash ~ '^[0-9a-f]{64}$'),
    state text not null default 'RESERVED' check (state in ('RESERVED', 'SERVED', 'RELEASED', 'CONSUMED')),
    idempotency_key text not null,
    reserved_at timestamptz not null default statement_timestamp(),
    lease_expires_at timestamptz not null default (statement_timestamp() + interval '5 minutes'),
    served_at timestamptz,
    resolved_at timestamptz,
    check (owner_subject ~ '^user_[A-Za-z0-9_-]{6,128}$'),
    unique (owner_subject, idempotency_key)
);

create index vvip_pulse_reservations_allocation_state_idx
    on public.vvip_pulse_reservations(allocation_id, state, lease_expires_at);

create table public.vvip_pulse_delivery_receipts (
    receipt_id uuid primary key default gen_random_uuid(),
    reservation_id uuid not null unique references public.vvip_pulse_reservations(reservation_id) on delete restrict,
    owner_subject text not null,
    qualified boolean not null,
    qualification_code text not null,
    policy_version text not null check (policy_version = 'PROOFVIEW_V1'),
    viewport_ratio numeric(5,4) not null check (viewport_ratio >= 0 and viewport_ratio <= 1),
    continuous_ms integer not null check (continuous_ms >= 0),
    foreground boolean not null,
    placement_eligible boolean not null,
    object_eligible boolean not null,
    invalid_traffic boolean not null,
    duplicate boolean not null,
    evidence_digest text not null check (evidence_digest ~ '^[0-9a-f]{64}$'),
    consume_units integer not null check (consume_units in (0, 1)),
    idempotency_key text not null,
    created_at timestamptz not null default statement_timestamp(),
    check (owner_subject ~ '^user_[A-Za-z0-9_-]{6,128}$'),
    check ((qualified and consume_units = 1) or ((not qualified) and consume_units = 0)),
    unique (owner_subject, idempotency_key)
);

create unique index vvip_pulse_delivery_receipts_qualified_evidence_idx
    on public.vvip_pulse_delivery_receipts(evidence_digest)
    where qualified;

create table public.vvip_pulse_ledger (
    ledger_id bigint generated always as identity primary key,
    owner_subject text not null,
    grant_id uuid references public.vvip_pulse_grants(grant_id) on delete restrict,
    allocation_id uuid references public.vvip_pulse_allocations(allocation_id) on delete restrict,
    allocation_group_id uuid,
    reservation_id uuid references public.vvip_pulse_reservations(reservation_id) on delete restrict,
    event_type text not null check (event_type in (
        'GRANT_ISSUED', 'ALLOCATED', 'ALLOCATION_PAUSED', 'MODE_CHANGED',
        'OPPORTUNITY_CHANGED', 'RESERVED', 'SERVED', 'VERIFIED',
        'ZERO_BURN', 'CONSUMED', 'RESERVATION_RELEASED'
    )),
    units bigint not null default 0 check (units >= 0),
    idempotency_key text not null,
    detail jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default statement_timestamp(),
    check (owner_subject ~ '^user_[A-Za-z0-9_-]{6,128}$'),
    unique (owner_subject, idempotency_key)
);

create index vvip_pulse_ledger_owner_idx
    on public.vvip_pulse_ledger(owner_subject, ledger_id desc);

alter table public.vvip_pulse_grants enable row level security;
alter table public.vvip_pulse_grants force row level security;
alter table public.vvip_pulse_allocations enable row level security;
alter table public.vvip_pulse_allocations force row level security;
alter table public.vvip_pulse_reservations enable row level security;
alter table public.vvip_pulse_reservations force row level security;
alter table public.vvip_pulse_delivery_receipts enable row level security;
alter table public.vvip_pulse_delivery_receipts force row level security;
alter table public.vvip_pulse_ledger enable row level security;
alter table public.vvip_pulse_ledger force row level security;

revoke all privileges on table public.vvip_pulse_grants from public, anon, authenticated, service_role;
revoke all privileges on table public.vvip_pulse_allocations from public, anon, authenticated, service_role;
revoke all privileges on table public.vvip_pulse_reservations from public, anon, authenticated, service_role;
revoke all privileges on table public.vvip_pulse_delivery_receipts from public, anon, authenticated, service_role;
revoke all privileges on table public.vvip_pulse_ledger from public, anon, authenticated, service_role;

create function public.vvip_pulse_guard_ledger_immutable()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $function$
begin
    raise exception 'PULSE_LEDGER_IMMUTABLE';
end;
$function$;

create trigger vvip_pulse_ledger_immutable_guard
before update or delete on public.vvip_pulse_ledger
for each row execute function public.vvip_pulse_guard_ledger_immutable();

revoke all on function public.vvip_pulse_guard_ledger_immutable()
from public, anon, authenticated, service_role;

create function public.vvip_pulse_append_ledger(
    p_owner text,
    p_event text,
    p_units bigint,
    p_idempotency_key text,
    p_grant uuid default null,
    p_allocation uuid default null,
    p_group uuid default null,
    p_reservation uuid default null,
    p_detail jsonb default '{}'::jsonb
)
returns bigint
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
    v_id bigint;
begin
    insert into public.vvip_pulse_ledger(
        owner_subject, event_type, units, idempotency_key,
        grant_id, allocation_id, allocation_group_id, reservation_id, detail
    ) values (
        p_owner, p_event, greatest(coalesce(p_units, 0), 0), p_idempotency_key,
        p_grant, p_allocation, p_group, p_reservation, coalesce(p_detail, '{}'::jsonb)
    )
    on conflict (owner_subject, idempotency_key) do nothing
    returning ledger_id into v_id;

    if v_id is null then
        select ledger_id into v_id
        from public.vvip_pulse_ledger
        where owner_subject = p_owner
          and idempotency_key = p_idempotency_key;
    end if;

    return v_id;
end;
$function$;

revoke all on function public.vvip_pulse_append_ledger(text, text, bigint, text, uuid, uuid, uuid, uuid, jsonb)
from public, anon, authenticated, service_role;

create function public.vvip_pulse_grant_available(p_grant uuid)
returns bigint
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
    select greatest(
        grant_row.granted_units - coalesce((
            select sum(allocation.allocation_units - allocation.released_units)
            from public.vvip_pulse_allocations allocation
            where allocation.grant_id = grant_row.grant_id
        ), 0),
        0
    )::bigint
    from public.vvip_pulse_grants grant_row
    where grant_row.grant_id = p_grant
      and grant_row.status = 'ACTIVE';
$function$;

revoke all on function public.vvip_pulse_grant_available(uuid)
from public, anon, authenticated, service_role;

create function public.vvip_pulse_grant_issue(
    p_owner_subject text,
    p_level text,
    p_granted_units bigint,
    p_purchase_reference text,
    p_country_code text,
    p_idempotency_key text
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
    v_grant uuid;
    v_country text := upper(btrim(coalesce(p_country_code, '')));
    v_level text := upper(btrim(coalesce(p_level, '')));
    v_purchase_reference text := btrim(coalesce(p_purchase_reference, ''));
begin
    if p_owner_subject is null or p_owner_subject !~ '^user_[A-Za-z0-9_-]{6,128}$' then
        raise exception 'PULSE_OWNER_INVALID';
    end if;
    if v_level not in ('PULSE_2', 'PULSE_10', 'PULSE_25', 'PULSE_45') then
        raise exception 'PULSE_LEVEL_INVALID';
    end if;
    if p_granted_units is null or p_granted_units <= 0 then
        raise exception 'PULSE_GRANT_UNITS_INVALID';
    end if;
    if length(v_purchase_reference) not between 8 and 180 then
        raise exception 'PULSE_PURCHASE_REFERENCE_INVALID';
    end if;
    if v_country !~ '^[A-Z]{2}$' then
        raise exception 'PULSE_COUNTRY_INVALID';
    end if;
    if p_idempotency_key is null or length(p_idempotency_key) not between 8 and 180 then
        raise exception 'PULSE_IDEMPOTENCY_KEY_INVALID';
    end if;

    perform pg_advisory_xact_lock(pg_catalog.hashtextextended(p_purchase_reference, 0));

    select grant_id into v_grant
    from public.vvip_pulse_grants
    where purchase_reference = btrim(p_purchase_reference);
    if found then
        return v_grant;
    end if;

    insert into public.vvip_pulse_grants(
        owner_subject, level, granted_units, purchase_reference, country_code
    ) values (
        p_owner_subject, v_level, p_granted_units, v_purchase_reference, v_country
    ) returning grant_id into v_grant;

    perform public.vvip_pulse_append_ledger(
        p_owner_subject, 'GRANT_ISSUED', p_granted_units, p_idempotency_key,
        v_grant, null, null, null,
        jsonb_build_object('level', v_level, 'country_code', v_country)
    );
    return v_grant;
end;
$function$;

revoke all on function public.vvip_pulse_grant_issue(text, text, bigint, text, text, text)
from public, anon, authenticated;
grant execute on function public.vvip_pulse_grant_issue(text, text, bigint, text, text, text)
to service_role;

create function public.vvip_pulse_vault_read()
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $function$
declare
    v_actor text := public.vvip_marketplace_actor_id();
    v_granted bigint := 0;
    v_consumed bigint := 0;
    v_allocated bigint := 0;
    v_available bigint := 0;
    v_groups jsonb := '[]'::jsonb;
begin
    if v_actor is null then
        raise exception 'PULSE_AUTH_REQUIRED';
    end if;

    select
        coalesce(sum(grant_row.granted_units), 0),
        coalesce(sum(public.vvip_pulse_grant_available(grant_row.grant_id)), 0)
    into v_granted, v_available
    from public.vvip_pulse_grants grant_row
    where grant_row.owner_subject = v_actor
      and grant_row.status = 'ACTIVE';

    select
        coalesce(sum(allocation.consumed_units), 0),
        coalesce(sum(allocation.allocation_units - allocation.consumed_units - allocation.released_units), 0)
    into v_consumed, v_allocated
    from public.vvip_pulse_allocations allocation
    join public.vvip_pulse_grants grant_row on grant_row.grant_id = allocation.grant_id
    where allocation.owner_subject = v_actor
      and grant_row.status = 'ACTIVE';

    select coalesce(jsonb_agg(group_row.item order by group_row.created_at desc), '[]'::jsonb)
      into v_groups
    from (
        select
            min(allocation.created_at) as created_at,
            jsonb_build_object(
                'allocationGroupId', allocation.allocation_group_id,
                'postId', min(allocation.post_id::text),
                'mode', min(allocation.mode),
                'state', case
                    when bool_or(allocation.auto_frozen) then 'FROZEN'
                    when bool_or(allocation.state = 'ACTIVE') then 'ACTIVE'
                    when bool_and(allocation.state = 'DEPLETED') then 'DEPLETED'
                    else 'PAUSED'
                end,
                'opportunityState', min(allocation.opportunity_state),
                'allocated', sum(allocation.allocation_units),
                'consumed', sum(allocation.consumed_units),
                'released', sum(allocation.released_units),
                'remaining', sum(allocation.allocation_units - allocation.consumed_units - allocation.released_units)
            ) as item
        from public.vvip_pulse_allocations allocation
        where allocation.owner_subject = v_actor
        group by allocation.allocation_group_id
    ) group_row;

    if v_available + v_allocated + v_consumed <> v_granted then
        raise exception 'PULSE_BALANCE_INVARIANT_BROKEN';
    end if;

    return jsonb_build_object(
        'ok', true,
        'granted', v_granted,
        'available', v_available,
        'allocated', v_allocated,
        'consumed', v_consumed,
        'expiresAt', null,
        'groups', v_groups
    );
end;
$function$;

revoke all on function public.vvip_pulse_vault_read()
from public, anon, authenticated;
grant execute on function public.vvip_pulse_vault_read()
to authenticated;

create function public.vvip_pulse_allocate(
    p_post_id uuid,
    p_requested_units bigint,
    p_mode text,
    p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
    v_actor text := public.vvip_marketplace_actor_id();
    v_mode text := upper(btrim(coalesce(p_mode, '')));
    v_remaining bigint := p_requested_units;
    v_available bigint;
    v_take bigint;
    v_group uuid := gen_random_uuid();
    v_allocation uuid;
    v_existing_group uuid;
    v_grant record;
begin
    if v_actor is null then raise exception 'PULSE_AUTH_REQUIRED'; end if;
    if p_requested_units is null or p_requested_units <= 0 then raise exception 'PULSE_ALLOCATION_UNITS_INVALID'; end if;
    if v_mode not in ('NOW', 'SMART', 'PRECISE') then raise exception 'PULSE_MODE_INVALID'; end if;
    if p_idempotency_key is null or length(p_idempotency_key) not between 8 and 180 then raise exception 'PULSE_IDEMPOTENCY_KEY_INVALID'; end if;

    select allocation_group_id into v_existing_group
      from public.vvip_pulse_allocations
     where owner_subject = v_actor and request_key = p_idempotency_key
     limit 1;
    if found then
        return jsonb_build_object('ok', true, 'allocationGroupId', v_existing_group, 'idempotent', true);
    end if;

    if not exists (
        select 1 from public.vvip_social_posts post
        where post.post_id = p_post_id
          and post.author_subject = v_actor
          and post.sector_key is not null
          and post.intent_class is not null
    ) then
        raise exception 'PULSE_OBJECT_NOT_ELIGIBLE';
    end if;

    for v_grant in
        select grant_row.*
        from public.vvip_pulse_grants grant_row
        where grant_row.owner_subject = v_actor
          and grant_row.status = 'ACTIVE'
        order by grant_row.created_at, grant_row.grant_id
        for update
    loop
        v_available := public.vvip_pulse_grant_available(v_grant.grant_id);
        if v_available <= 0 then continue; end if;
        v_take := least(v_available, v_remaining);

        insert into public.vvip_pulse_allocations(
            allocation_group_id, grant_id, owner_subject, post_id, mode,
            allocation_units, request_key
        ) values (
            v_group, v_grant.grant_id, v_actor, p_post_id, v_mode,
            v_take, p_idempotency_key
        ) returning allocation_id into v_allocation;

        perform public.vvip_pulse_append_ledger(
            v_actor, 'ALLOCATED', v_take,
            p_idempotency_key || ':alloc:' || v_grant.grant_id::text,
            v_grant.grant_id, v_allocation, v_group, null,
            jsonb_build_object('post_id', p_post_id, 'mode', v_mode)
        );

        v_remaining := v_remaining - v_take;
        exit when v_remaining = 0;
    end loop;

    if v_remaining <> 0 then
        raise exception 'PULSE_INSUFFICIENT_AVAILABLE';
    end if;

    return jsonb_build_object(
        'ok', true,
        'allocationGroupId', v_group,
        'allocated', p_requested_units,
        'mode', v_mode,
        'idempotent', false
    );
end;
$function$;

revoke all on function public.vvip_pulse_allocate(uuid, bigint, text, text)
from public, anon, authenticated;
grant execute on function public.vvip_pulse_allocate(uuid, bigint, text, text)
to authenticated;

create function public.vvip_pulse_pause_allocation(
    p_allocation_group_id uuid,
    p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
    v_actor text := public.vvip_marketplace_actor_id();
    v_released bigint := 0;
    v_row record;
begin
    if v_actor is null then raise exception 'PULSE_AUTH_REQUIRED'; end if;
    if p_idempotency_key is null or length(p_idempotency_key) not between 8 and 180 then raise exception 'PULSE_IDEMPOTENCY_KEY_INVALID'; end if;

    if exists (
        select 1 from public.vvip_pulse_ledger
        where owner_subject = v_actor and idempotency_key = p_idempotency_key || ':pause'
    ) then
        return jsonb_build_object('ok', true, 'allocationGroupId', p_allocation_group_id, 'idempotent', true);
    end if;

    perform 1
      from public.vvip_pulse_allocations allocation
     where allocation.owner_subject = v_actor
       and allocation.allocation_group_id = p_allocation_group_id
     for update;
    if not found then raise exception 'PULSE_ALLOCATION_NOT_FOUND'; end if;

    if exists (
        select 1
        from public.vvip_pulse_reservations reservation
        join public.vvip_pulse_allocations allocation on allocation.allocation_id = reservation.allocation_id
        where allocation.owner_subject = v_actor
          and allocation.allocation_group_id = p_allocation_group_id
          and reservation.state = 'SERVED'
          and reservation.lease_expires_at > statement_timestamp()
    ) then
        raise exception 'PULSE_DELIVERY_SETTLEMENT_PENDING';
    end if;

    for v_row in
        select reservation.reservation_id, reservation.allocation_id
        from public.vvip_pulse_reservations reservation
        join public.vvip_pulse_allocations allocation on allocation.allocation_id = reservation.allocation_id
        where allocation.owner_subject = v_actor
          and allocation.allocation_group_id = p_allocation_group_id
          and reservation.state = 'RESERVED'
        for update of reservation
    loop
        update public.vvip_pulse_reservations
           set state = 'RELEASED', resolved_at = statement_timestamp()
         where reservation_id = v_row.reservation_id;
        perform public.vvip_pulse_append_ledger(
            v_actor, 'RESERVATION_RELEASED', 0,
            p_idempotency_key || ':release:' || v_row.reservation_id::text,
            null, v_row.allocation_id, p_allocation_group_id, v_row.reservation_id,
            jsonb_build_object('reason', 'USER_PAUSE')
        );
    end loop;

    select coalesce(sum(allocation_units - consumed_units - released_units), 0)
      into v_released
      from public.vvip_pulse_allocations
     where owner_subject = v_actor
       and allocation_group_id = p_allocation_group_id;

    update public.vvip_pulse_allocations
       set released_units = allocation_units - consumed_units,
           state = case when consumed_units = allocation_units then 'DEPLETED' else 'PAUSED' end,
           auto_frozen = false,
           opportunity_state = case when consumed_units = allocation_units then opportunity_state else 'BALANCED' end,
           opportunity_reason = null,
           updated_at = statement_timestamp()
     where owner_subject = v_actor
       and allocation_group_id = p_allocation_group_id
       and state = 'ACTIVE';

    perform public.vvip_pulse_append_ledger(
        v_actor, 'ALLOCATION_PAUSED', v_released, p_idempotency_key || ':pause',
        null, null, p_allocation_group_id, null,
        jsonb_build_object('released_units', v_released)
    );

    return jsonb_build_object(
        'ok', true,
        'allocationGroupId', p_allocation_group_id,
        'released', v_released,
        'idempotent', false
    );
end;
$function$;

revoke all on function public.vvip_pulse_pause_allocation(uuid, text)
from public, anon, authenticated;
grant execute on function public.vvip_pulse_pause_allocation(uuid, text)
to authenticated;

create function public.vvip_pulse_mode_set(
    p_allocation_group_id uuid,
    p_mode text,
    p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
    v_actor text := public.vvip_marketplace_actor_id();
    v_mode text := upper(btrim(coalesce(p_mode, '')));
begin
    if v_actor is null then raise exception 'PULSE_AUTH_REQUIRED'; end if;
    if v_mode not in ('NOW', 'SMART', 'PRECISE') then raise exception 'PULSE_MODE_INVALID'; end if;
    if p_idempotency_key is null or length(p_idempotency_key) not between 8 and 180 then raise exception 'PULSE_IDEMPOTENCY_KEY_INVALID'; end if;

    perform 1 from public.vvip_pulse_allocations
     where owner_subject = v_actor
       and allocation_group_id = p_allocation_group_id
       and state = 'ACTIVE'
     for update;
    if not found then raise exception 'PULSE_ALLOCATION_NOT_ACTIVE'; end if;

    update public.vvip_pulse_allocations
       set mode = v_mode, updated_at = statement_timestamp()
     where owner_subject = v_actor
       and allocation_group_id = p_allocation_group_id
       and state = 'ACTIVE';

    perform public.vvip_pulse_append_ledger(
        v_actor, 'MODE_CHANGED', 0, p_idempotency_key || ':mode',
        null, null, p_allocation_group_id, null,
        jsonb_build_object('mode', v_mode)
    );

    return jsonb_build_object('ok', true, 'allocationGroupId', p_allocation_group_id, 'mode', v_mode);
end;
$function$;

revoke all on function public.vvip_pulse_mode_set(uuid, text, text)
from public, anon, authenticated;
grant execute on function public.vvip_pulse_mode_set(uuid, text, text)
to authenticated;

create function public.vvip_pulse_opportunity_set(
    p_allocation_group_id uuid,
    p_state text,
    p_reason text,
    p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
    v_state text := upper(btrim(coalesce(p_state, '')));
    v_owner text;
begin
    if v_state not in ('LOW', 'BALANCED', 'STRONG', 'FROZEN') then raise exception 'PULSE_OPPORTUNITY_STATE_INVALID'; end if;
    if p_idempotency_key is null or length(p_idempotency_key) not between 8 and 180 then raise exception 'PULSE_IDEMPOTENCY_KEY_INVALID'; end if;

    select owner_subject into v_owner
      from public.vvip_pulse_allocations
     where allocation_group_id = p_allocation_group_id
       and state = 'ACTIVE'
     limit 1
     for update;
    if not found then raise exception 'PULSE_ALLOCATION_NOT_ACTIVE'; end if;

    update public.vvip_pulse_allocations
       set opportunity_state = v_state,
           opportunity_reason = left(nullif(btrim(p_reason), ''), 160),
           auto_frozen = (v_state = 'FROZEN'),
           updated_at = statement_timestamp()
     where allocation_group_id = p_allocation_group_id
       and state = 'ACTIVE';

    perform public.vvip_pulse_append_ledger(
        v_owner, 'OPPORTUNITY_CHANGED', 0, p_idempotency_key || ':opportunity',
        null, null, p_allocation_group_id, null,
        jsonb_build_object('state', v_state, 'reason', left(nullif(btrim(p_reason), ''), 160))
    );

    return jsonb_build_object('ok', true, 'allocationGroupId', p_allocation_group_id, 'state', v_state, 'autoFrozen', (v_state = 'FROZEN'));
end;
$function$;

revoke all on function public.vvip_pulse_opportunity_set(uuid, text, text, text)
from public, anon, authenticated;
grant execute on function public.vvip_pulse_opportunity_set(uuid, text, text, text)
to service_role;

create function public.vvip_pulse_delivery_reserve(
    p_allocation_group_id uuid,
    p_viewer_hash text,
    p_idempotency_key text
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
    v_existing uuid;
    v_row record;
    v_expired record;
    v_open bigint;
    v_remaining bigint;
    v_reservation uuid;
begin
    if p_viewer_hash is null or p_viewer_hash !~ '^[0-9a-f]{64}$' then raise exception 'PULSE_VIEWER_HASH_INVALID'; end if;
    if p_idempotency_key is null or length(p_idempotency_key) not between 8 and 180 then raise exception 'PULSE_IDEMPOTENCY_KEY_INVALID'; end if;

    select reservation.reservation_id into v_existing
      from public.vvip_pulse_reservations reservation
      join public.vvip_pulse_allocations allocation
        on allocation.allocation_id = reservation.allocation_id
       and reservation.owner_subject = allocation.owner_subject
     where allocation.allocation_group_id = p_allocation_group_id
       and reservation.idempotency_key = p_idempotency_key
     limit 1;
    if found then return v_existing; end if;

    for v_expired in
        select reservation.reservation_id, allocation.owner_subject,
               allocation.grant_id, allocation.allocation_id, allocation.allocation_group_id
        from public.vvip_pulse_reservations reservation
        join public.vvip_pulse_allocations allocation
          on allocation.allocation_id = reservation.allocation_id
        where allocation.allocation_group_id = p_allocation_group_id
          and reservation.state in ('RESERVED', 'SERVED')
          and reservation.lease_expires_at <= statement_timestamp()
        for update of reservation
    loop
        update public.vvip_pulse_reservations
           set state = 'RELEASED', resolved_at = statement_timestamp()
         where reservation_id = v_expired.reservation_id;
        perform public.vvip_pulse_append_ledger(
            v_expired.owner_subject, 'RESERVATION_RELEASED', 0,
            'lease-expired:' || v_expired.reservation_id::text,
            v_expired.grant_id, v_expired.allocation_id, v_expired.allocation_group_id,
            v_expired.reservation_id, jsonb_build_object('reason', 'LEASE_EXPIRED_ZERO_BURN')
        );
    end loop;

    for v_row in
        select allocation.*
        from public.vvip_pulse_allocations allocation
        where allocation.allocation_group_id = p_allocation_group_id
          and allocation.state = 'ACTIVE'
          and not allocation.auto_frozen
          and allocation.opportunity_state <> 'FROZEN'
        order by allocation.created_at, allocation.allocation_id
        for update
    loop
        select count(*) into v_open
          from public.vvip_pulse_reservations reservation
         where reservation.allocation_id = v_row.allocation_id
           and reservation.state in ('RESERVED', 'SERVED')
           and reservation.lease_expires_at > statement_timestamp();
        v_remaining := v_row.allocation_units - v_row.consumed_units - v_row.released_units - v_open;
        if v_remaining <= 0 then continue; end if;

        insert into public.vvip_pulse_reservations(
            allocation_id, owner_subject, viewer_hash, idempotency_key
        ) values (
            v_row.allocation_id, v_row.owner_subject, p_viewer_hash, p_idempotency_key
        ) returning reservation_id into v_reservation;

        perform public.vvip_pulse_append_ledger(
            v_row.owner_subject, 'RESERVED', 1, p_idempotency_key || ':reserve',
            v_row.grant_id, v_row.allocation_id, v_row.allocation_group_id, v_reservation,
            jsonb_build_object('lease_seconds', 300)
        );
        return v_reservation;
    end loop;

    if exists (
        select 1 from public.vvip_pulse_allocations
        where allocation_group_id = p_allocation_group_id
          and state = 'ACTIVE'
          and (auto_frozen or opportunity_state = 'FROZEN')
    ) then
        raise exception 'PULSE_AUTO_FROZEN';
    end if;
    raise exception 'PULSE_ALLOCATION_DEPLETED';
end;
$function$;

revoke all on function public.vvip_pulse_delivery_reserve(uuid, text, text)
from public, anon, authenticated;
grant execute on function public.vvip_pulse_delivery_reserve(uuid, text, text)
to service_role;

create function public.vvip_pulse_delivery_mark_served(
    p_reservation_id uuid,
    p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
    v_reservation public.vvip_pulse_reservations%rowtype;
    v_allocation public.vvip_pulse_allocations%rowtype;
begin
    if p_idempotency_key is null or length(p_idempotency_key) not between 8 and 180 then raise exception 'PULSE_IDEMPOTENCY_KEY_INVALID'; end if;

    select * into v_reservation
      from public.vvip_pulse_reservations
     where reservation_id = p_reservation_id
     for update;
    if not found then
        raise exception 'PROOFVIEW_RESERVATION_INVALID';
    end if;

    select * into v_allocation
      from public.vvip_pulse_allocations
     where allocation_id = v_reservation.allocation_id;
    if not found then
        raise exception 'PROOFVIEW_RESERVATION_INVALID';
    end if;

    if v_reservation.state = 'SERVED'
       and v_reservation.lease_expires_at > statement_timestamp() then
        return jsonb_build_object('ok', true, 'reservationId', p_reservation_id, 'state', 'SERVED', 'idempotent', true);
    end if;

    if v_reservation.state <> 'RESERVED'
       or v_reservation.lease_expires_at <= statement_timestamp() then
        if v_reservation.state in ('RESERVED', 'SERVED') then
            update public.vvip_pulse_reservations
               set state = 'RELEASED', resolved_at = statement_timestamp()
             where reservation_id = p_reservation_id;
            perform public.vvip_pulse_append_ledger(
                v_reservation.owner_subject, 'RESERVATION_RELEASED', 0,
                p_idempotency_key || ':reservation-invalid',
                v_allocation.grant_id, v_allocation.allocation_id, v_allocation.allocation_group_id,
                p_reservation_id, jsonb_build_object('reason', 'PROOFVIEW_RESERVATION_INVALID')
            );
        end if;
        return jsonb_build_object(
            'ok', false,
            'reservationId', p_reservation_id,
            'code', 'PROOFVIEW_RESERVATION_INVALID',
            'consumeUnits', 0
        );
    end if;

    update public.vvip_pulse_reservations
       set state = 'SERVED', served_at = statement_timestamp()
     where reservation_id = p_reservation_id;

    perform public.vvip_pulse_append_ledger(
        v_reservation.owner_subject, 'SERVED', 0, p_idempotency_key || ':served',
        v_allocation.grant_id, v_allocation.allocation_id, v_allocation.allocation_group_id, p_reservation_id,
        '{}'::jsonb
    );
    return jsonb_build_object('ok', true, 'reservationId', p_reservation_id, 'state', 'SERVED', 'idempotent', false);
end;
$function$;

revoke all on function public.vvip_pulse_delivery_mark_served(uuid, text)
from public, anon, authenticated;
grant execute on function public.vvip_pulse_delivery_mark_served(uuid, text)
to service_role;

create function public.vvip_pulse_delivery_verify(
    p_reservation_id uuid,
    p_viewport_ratio numeric,
    p_continuous_ms integer,
    p_foreground boolean,
    p_placement_eligible boolean,
    p_object_eligible boolean,
    p_invalid_traffic boolean,
    p_duplicate boolean,
    p_evidence_digest text,
    p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
    v_reservation public.vvip_pulse_reservations%rowtype;
    v_allocation public.vvip_pulse_allocations%rowtype;
    v_receipt public.vvip_pulse_delivery_receipts%rowtype;
    v_qualified boolean := false;
    v_code text := 'PROOFVIEW_EVIDENCE_INVALID';
    v_duplicate boolean := coalesce(p_duplicate, true);
    v_consume integer := 0;
begin
    if p_idempotency_key is null or length(p_idempotency_key) not between 8 and 180 then raise exception 'PULSE_IDEMPOTENCY_KEY_INVALID'; end if;
    if p_evidence_digest is null or p_evidence_digest !~ '^[0-9a-f]{64}$' then raise exception 'PROOFVIEW_EVIDENCE_DIGEST_INVALID'; end if;
    if p_viewport_ratio is null or p_viewport_ratio < 0 or p_viewport_ratio > 1 or p_continuous_ms is null or p_continuous_ms < 0
       or p_foreground is null or p_placement_eligible is null or p_object_eligible is null
       or p_invalid_traffic is null or p_duplicate is null then
        raise exception 'PROOFVIEW_EVIDENCE_INVALID';
    end if;

    perform pg_advisory_xact_lock(pg_catalog.hashtextextended(p_evidence_digest, 0));

    select * into v_reservation
      from public.vvip_pulse_reservations
     where reservation_id = p_reservation_id
     for update;
    if not found then
        raise exception 'PROOFVIEW_RESERVATION_INVALID';
    end if;

    select * into v_receipt
      from public.vvip_pulse_delivery_receipts
     where reservation_id = p_reservation_id;
    if found then
        return jsonb_build_object(
            'ok', true, 'qualified', v_receipt.qualified,
            'code', v_receipt.qualification_code,
            'consumeUnits', v_receipt.consume_units,
            'policyVersion', v_receipt.policy_version,
            'idempotent', true
        );
    end if;

    select * into v_allocation
      from public.vvip_pulse_allocations
     where allocation_id = v_reservation.allocation_id
     for update;
    if not found then
        raise exception 'PROOFVIEW_RESERVATION_INVALID';
    end if;

    if v_reservation.state <> 'SERVED'
       or v_reservation.lease_expires_at <= statement_timestamp() then
        v_code := 'PROOFVIEW_RESERVATION_INVALID';
        v_qualified := false;
        v_consume := 0;

        if v_reservation.state in ('RESERVED', 'SERVED') then
            update public.vvip_pulse_reservations
               set state = 'RELEASED', resolved_at = statement_timestamp()
             where reservation_id = p_reservation_id;
            perform public.vvip_pulse_append_ledger(
                v_reservation.owner_subject, 'RESERVATION_RELEASED', 0,
                p_idempotency_key || ':reservation-invalid',
                v_allocation.grant_id, v_allocation.allocation_id, v_allocation.allocation_group_id,
                p_reservation_id, jsonb_build_object('reason', v_code)
            );
        end if;

        insert into public.vvip_pulse_delivery_receipts(
            reservation_id, owner_subject, qualified, qualification_code, policy_version,
            viewport_ratio, continuous_ms, foreground, placement_eligible, object_eligible,
            invalid_traffic, duplicate, evidence_digest, consume_units, idempotency_key
        ) values (
            p_reservation_id, v_reservation.owner_subject, false, v_code, 'PROOFVIEW_V1',
            p_viewport_ratio, p_continuous_ms, p_foreground, p_placement_eligible, p_object_eligible,
            p_invalid_traffic, p_duplicate, p_evidence_digest, 0, p_idempotency_key
        ) returning * into v_receipt;

        perform public.vvip_pulse_append_ledger(
            v_reservation.owner_subject, 'ZERO_BURN', 0, p_idempotency_key || ':zero-burn',
            v_allocation.grant_id, v_allocation.allocation_id, v_allocation.allocation_group_id,
            p_reservation_id, jsonb_build_object('receipt_id', v_receipt.receipt_id, 'reason', v_code)
        );

        return jsonb_build_object(
            'ok', true,
            'qualified', false,
            'code', v_code,
            'consumeUnits', 0,
            'policyVersion', 'PROOFVIEW_V1',
            'idempotent', false
        );
    end if;

    if exists (
        select 1 from public.vvip_pulse_delivery_receipts receipt
        where receipt.evidence_digest = p_evidence_digest and receipt.qualified
    ) then
        v_duplicate := true;
    end if;

    if not p_object_eligible then v_code := 'PROOFVIEW_OBJECT_INELIGIBLE';
    elsif not p_placement_eligible then v_code := 'PROOFVIEW_PLACEMENT_INELIGIBLE';
    elsif p_invalid_traffic then v_code := 'PROOFVIEW_INVALID_TRAFFIC';
    elsif v_duplicate then v_code := 'PROOFVIEW_DUPLICATE';
    elsif not p_foreground then v_code := 'PROOFVIEW_BACKGROUND';
    elsif p_viewport_ratio < 0.5 then v_code := 'PROOFVIEW_MIN_VIEWPORT_NOT_MET';
    elsif p_continuous_ms < 2000 then v_code := 'PROOFVIEW_MIN_TIME_NOT_MET';
    else
        v_qualified := true;
        v_code := 'PROOFVIEW_QUALIFIED';
        v_consume := 1;
    end if;

    if v_qualified then
        if v_allocation.state <> 'ACTIVE'
           or v_allocation.consumed_units + v_allocation.released_units >= v_allocation.allocation_units then
            v_qualified := false;
            v_code := 'PROOFVIEW_RESERVATION_INVALID';
            v_consume := 0;
        else
            update public.vvip_pulse_allocations
               set consumed_units = consumed_units + 1,
                   state = case when consumed_units + 1 + released_units = allocation_units then 'DEPLETED' else state end,
                   updated_at = statement_timestamp()
             where allocation_id = v_allocation.allocation_id;
        end if;
    end if;

    update public.vvip_pulse_reservations
       set state = case when v_qualified then 'CONSUMED' else 'RELEASED' end,
           resolved_at = statement_timestamp()
     where reservation_id = p_reservation_id;

    insert into public.vvip_pulse_delivery_receipts(
        reservation_id, owner_subject, qualified, qualification_code, policy_version,
        viewport_ratio, continuous_ms, foreground, placement_eligible, object_eligible,
        invalid_traffic, duplicate, evidence_digest, consume_units, idempotency_key
    ) values (
        p_reservation_id, v_reservation.owner_subject, v_qualified, v_code, 'PROOFVIEW_V1',
        p_viewport_ratio, p_continuous_ms, p_foreground, p_placement_eligible, p_object_eligible,
        p_invalid_traffic, v_duplicate, p_evidence_digest, v_consume, p_idempotency_key
    ) returning * into v_receipt;

    perform public.vvip_pulse_append_ledger(
        v_reservation.owner_subject, 'VERIFIED', 0, p_idempotency_key || ':verified',
        v_allocation.grant_id, v_allocation.allocation_id, v_allocation.allocation_group_id, p_reservation_id,
        jsonb_build_object('qualified', v_qualified, 'code', v_code, 'policy', 'PROOFVIEW_V1')
    );

    if v_qualified then
        perform public.vvip_pulse_append_ledger(
            v_reservation.owner_subject, 'CONSUMED', 1, p_idempotency_key || ':consume',
            v_allocation.grant_id, v_allocation.allocation_id, v_allocation.allocation_group_id, p_reservation_id,
            jsonb_build_object('receipt_id', v_receipt.receipt_id)
        );
    else
        perform public.vvip_pulse_append_ledger(
            v_reservation.owner_subject, 'ZERO_BURN', 0, p_idempotency_key || ':zero-burn',
            v_allocation.grant_id, v_allocation.allocation_id, v_allocation.allocation_group_id, p_reservation_id,
            jsonb_build_object('receipt_id', v_receipt.receipt_id, 'reason', v_code)
        );
    end if;

    return jsonb_build_object(
        'ok', true,
        'qualified', v_qualified,
        'code', v_code,
        'consumeUnits', v_consume,
        'policyVersion', 'PROOFVIEW_V1',
        'idempotent', false
    );
end;
$function$;

revoke all on function public.vvip_pulse_delivery_verify(uuid, numeric, integer, boolean, boolean, boolean, boolean, boolean, text, text)
from public, anon, authenticated;
grant execute on function public.vvip_pulse_delivery_verify(uuid, numeric, integer, boolean, boolean, boolean, boolean, boolean, text, text)
to service_role;

commit;
