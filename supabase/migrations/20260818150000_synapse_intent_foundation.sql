-- TIGER SYNAPSE S1 — actor-bound, expiring intent foundation.

create table public.vvip_synapse_intents (
    intent_id uuid primary key default gen_random_uuid(),
    actor_subject text not null,
    direction text not null check (direction in ('NEED', 'OFFER')),
    sector text not null check (char_length(btrim(sector)) between 1 and 80),
    category text not null check (char_length(btrim(category)) between 1 and 80),
    summary text not null check (char_length(btrim(summary)) between 1 and 500),
    required_constraints jsonb not null default '{}'::jsonb check (jsonb_typeof(required_constraints) = 'object'),
    preferences jsonb not null default '{}'::jsonb check (jsonb_typeof(preferences) = 'object'),
    market_policy jsonb not null default '{}'::jsonb check (jsonb_typeof(market_policy) = 'object'),
    activation_mode text not null check (activation_mode in ('PRIVATE_LOCAL', 'ASSISTED', 'LIVE_NETWORK')),
    visibility_class text not null check (visibility_class in ('PRIVATE_LOCAL', 'MATCHING_NETWORK')),
    created_at timestamptz not null default timezone('utc', now()),
    expires_at timestamptz not null,
    status text not null default 'CONFIRMED' check (status in ('CONFIRMED', 'MATCHING', 'ACTIVE', 'PAUSED', 'REJECTED', 'CANCELLED', 'EXPIRED')),
    source_provenance text not null check (source_provenance in ('USER_DECLARED', 'ASSISTED_DRAFT', 'SOCIAL_ACTION')),
    schema_version text not null,
    policy_version text not null,
    revision integer not null default 0 check (revision >= 0),
    updated_at timestamptz not null default timezone('utc', now()),
    constraint vvip_synapse_intents_expiry_after_creation check (expires_at > created_at)
);

create index vvip_synapse_intents_actor_status_idx
    on public.vvip_synapse_intents (actor_subject, status, expires_at);

create index vvip_synapse_intents_active_expiry_idx
    on public.vvip_synapse_intents (status, expires_at)
    where status in ('MATCHING', 'ACTIVE', 'PAUSED');

alter table public.vvip_synapse_intents enable row level security;
alter table public.vvip_synapse_intents force row level security;
revoke all privileges on table public.vvip_synapse_intents from public, anon, authenticated;

create function public.vvip_synapse_intent_create(
    p_direction text,
    p_sector text,
    p_category text,
    p_summary text,
    p_required_constraints jsonb,
    p_preferences jsonb,
    p_market_policy jsonb,
    p_activation_mode text,
    p_visibility_class text,
    p_expires_at timestamptz,
    p_source_provenance text,
    p_schema_version text,
    p_policy_version text,
    p_explicit_confirmation boolean
)
returns jsonb
language plpgsql
security definer set search_path = pg_catalog
as $function$
declare
    v_actor text := public.vvip_marketplace_actor_id();
    v_status text;
    v_intent public.vvip_synapse_intents%rowtype;
begin
    if v_actor is null or v_actor not like 'user\_%' escape '\' then
        raise exception 'INTENT_AUTH_REQUIRED';
    end if;
    if p_explicit_confirmation is not true then
        raise exception 'INTENT_CONFIRMATION_REQUIRED';
    end if;
    if p_activation_mode = 'PRIVATE_LOCAL' then
        raise exception 'INTENT_PRIVATE_LOCAL_NOT_PERSISTED';
    end if;
    if p_activation_mode not in ('ASSISTED', 'LIVE_NETWORK') then
        raise exception 'INTENT_MODE_INVALID';
    end if;
    if p_expires_at <= timezone('utc', now()) or p_expires_at > timezone('utc', now()) + interval '30 days' then
        raise exception 'INTENT_EXPIRY_INVALID';
    end if;
    if p_summary is null or char_length(btrim(p_summary)) not between 1 and 500 then
        raise exception 'INTENT_SUMMARY_INVALID';
    end if;
    if jsonb_typeof(coalesce(p_required_constraints, '{}'::jsonb)) <> 'object'
       or jsonb_typeof(coalesce(p_preferences, '{}'::jsonb)) <> 'object'
       or jsonb_typeof(coalesce(p_market_policy, '{}'::jsonb)) <> 'object' then
        raise exception 'INTENT_OBJECT_INVALID';
    end if;

    v_status := case when p_activation_mode = 'LIVE_NETWORK' then 'MATCHING' else 'CONFIRMED' end;

    insert into public.vvip_synapse_intents (
        actor_subject,
        direction,
        sector,
        category,
        summary,
        required_constraints,
        preferences,
        market_policy,
        activation_mode,
        visibility_class,
        expires_at,
        status,
        source_provenance,
        schema_version,
        policy_version
    ) values (
        v_actor,
        p_direction,
        btrim(p_sector),
        btrim(p_category),
        btrim(p_summary),
        coalesce(p_required_constraints, '{}'::jsonb),
        coalesce(p_preferences, '{}'::jsonb),
        coalesce(p_market_policy, '{}'::jsonb),
        p_activation_mode,
        p_visibility_class,
        p_expires_at,
        v_status,
        p_source_provenance,
        p_schema_version,
        p_policy_version
    ) returning * into v_intent;

    return jsonb_build_object(
        'ok', true,
        'intent_id', v_intent.intent_id,
        'status', v_intent.status,
        'revision', v_intent.revision,
        'expires_at', v_intent.expires_at
    );
end;
$function$;

create function public.vvip_synapse_intent_transition(
    p_intent_id uuid,
    p_target_status text,
    p_expected_revision integer,
    p_policy_admitted boolean
)
returns jsonb
language plpgsql
security definer set search_path = pg_catalog
as $function$
declare
    v_actor text := public.vvip_marketplace_actor_id();
    v_intent public.vvip_synapse_intents%rowtype;
begin
    if v_actor is null or v_actor not like 'user\_%' escape '\' then
        raise exception 'INTENT_AUTH_REQUIRED';
    end if;
    select * into v_intent
    from public.vvip_synapse_intents
    where intent_id = p_intent_id and actor_subject = v_actor
    for update;
    if not found then
        raise exception 'INTENT_NOT_FOUND';
    end if;
    if v_intent.revision <> p_expected_revision then
        raise exception 'INTENT_REVISION_CONFLICT';
    end if;
    if v_intent.status in ('REJECTED', 'CANCELLED', 'EXPIRED') then
        raise exception 'INTENT_TERMINAL';
    end if;
    if p_target_status = 'ACTIVE' and p_policy_admitted is not true then
        raise exception 'INTENT_POLICY_REQUIRED';
    end if;
    if p_target_status = 'EXPIRED' and timezone('utc', now()) < v_intent.expires_at then
        raise exception 'INTENT_NOT_EXPIRED';
    end if;
    if not (
        (v_intent.status = 'CONFIRMED' and p_target_status in ('MATCHING', 'REJECTED', 'CANCELLED'))
        or (v_intent.status = 'MATCHING' and p_target_status in ('ACTIVE', 'REJECTED', 'CANCELLED'))
        or (v_intent.status = 'ACTIVE' and p_target_status in ('PAUSED', 'CANCELLED', 'EXPIRED'))
        or (v_intent.status = 'PAUSED' and p_target_status in ('ACTIVE', 'CANCELLED', 'EXPIRED'))
    ) then
        raise exception 'INTENT_TRANSITION_INVALID';
    end if;

    update public.vvip_synapse_intents
    set status = p_target_status,
        revision = revision + 1,
        updated_at = timezone('utc', now())
    where intent_id = v_intent.intent_id;

    return jsonb_build_object(
        'ok', true,
        'intent_id', v_intent.intent_id,
        'status', p_target_status,
        'revision', v_intent.revision + 1
    );
end;
$function$;

grant execute on function public.vvip_synapse_intent_create(text, text, text, text, jsonb, jsonb, jsonb, text, text, timestamptz, text, text, text, boolean) to authenticated;
grant execute on function public.vvip_synapse_intent_transition(uuid, text, integer, boolean) to authenticated;
