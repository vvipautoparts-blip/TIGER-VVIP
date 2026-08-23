-- TIGER PRIVATE MARKET GENESIS — durable cross-instance Contact/Handoff replay authority.
-- Stores bounded replay bindings only. Raw nonces, private intent, PII, message content,
-- and buyer/seller transaction state are deliberately outside this authority.

begin;

create table if not exists public.market_contact_replay_authority (
  capability_id text primary key,
  authorization_nonce_hash text not null,
  request_id text not null,
  requester_subject text not null,
  owner_subject_ref text not null,
  ad_id text not null,
  sector_id text not null,
  country text not null,
  channel text not null,
  policy_version text not null,
  physics_version text not null,
  reveal_policy_ref text,
  reveal_authorized boolean not null default false,
  issued_at timestamptz not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  constraint market_contact_authorization_nonce_hash_unique unique (authorization_nonce_hash),
  constraint market_contact_nonce_hash_check check (authorization_nonce_hash ~ '^[0-9a-f]{64}$'),
  constraint market_contact_capability_id_length_check check (char_length(capability_id) between 1 and 256),
  constraint market_contact_request_id_length_check check (char_length(request_id) between 1 and 256),
  constraint market_contact_requester_length_check check (char_length(requester_subject) between 1 and 256),
  constraint market_contact_owner_length_check check (char_length(owner_subject_ref) between 1 and 256),
  constraint market_contact_ad_id_length_check check (char_length(ad_id) between 1 and 256),
  constraint market_contact_sector_length_check check (char_length(sector_id) between 1 and 128),
  constraint market_contact_country_length_check check (char_length(country) between 2 and 16),
  constraint market_contact_channel_check check (channel = 'SOCIAL_MESSAGE'),
  constraint market_contact_policy_length_check check (char_length(policy_version) between 1 and 128),
  constraint market_contact_physics_length_check check (char_length(physics_version) between 1 and 128),
  constraint market_contact_reveal_policy_length_check check (
    reveal_policy_ref is null or char_length(reveal_policy_ref) between 1 and 256
  ),
  constraint market_contact_time_window_check check (expires_at > issued_at),
  constraint market_contact_ttl_check check (expires_at <= issued_at + interval '5 minutes'),
  constraint market_contact_consumed_window_check check (consumed_at is null or consumed_at >= issued_at)
);

create index if not exists market_contact_replay_expiry_idx
  on public.market_contact_replay_authority (expires_at)
  where consumed_at is null;

alter table public.market_contact_replay_authority enable row level security;
alter table public.market_contact_replay_authority force row level security;

revoke all on table public.market_contact_replay_authority from public, anon, authenticated, service_role;

create or replace function public.issue_market_contact_capability(
  p_authorization_nonce_hash text,
  p_capability_id text,
  p_request_id text,
  p_requester_subject text,
  p_owner_subject_ref text,
  p_ad_id text,
  p_sector_id text,
  p_country text,
  p_channel text,
  p_policy_version text,
  p_physics_version text,
  p_reveal_policy_ref text,
  p_reveal_authorized boolean,
  p_issued_at timestamptz,
  p_expires_at timestamptz
)
returns table (
  ok boolean,
  reason_code text
)
language plpgsql
security definer set search_path = pg_catalog
as $$
declare
  v_rows integer := 0;
begin
  if p_authorization_nonce_hash is null
    or p_authorization_nonce_hash !~ '^[0-9a-f]{64}$'
    or p_capability_id is null or char_length(p_capability_id) not between 1 and 256
    or p_request_id is null or char_length(p_request_id) not between 1 and 256
    or p_requester_subject is null or char_length(p_requester_subject) not between 1 and 256
    or p_owner_subject_ref is null or char_length(p_owner_subject_ref) not between 1 and 256
    or p_ad_id is null or char_length(p_ad_id) not between 1 and 256
    or p_sector_id is null or char_length(p_sector_id) not between 1 and 128
    or p_country is null or char_length(p_country) not between 2 and 16
    or p_channel is distinct from 'SOCIAL_MESSAGE'
    or p_policy_version is null or char_length(p_policy_version) not between 1 and 128
    or p_physics_version is null or char_length(p_physics_version) not between 1 and 128
    or (p_reveal_policy_ref is not null and char_length(p_reveal_policy_ref) not between 1 and 256)
    or p_issued_at is null
    or p_expires_at is null
    or p_expires_at <= p_issued_at
    or p_expires_at > p_issued_at + interval '5 minutes'
    or p_expires_at <= statement_timestamp()
    or p_issued_at > statement_timestamp() then
    return query select false, 'CONTACT_REPLAY_OR_CONFLICT'::text;
    return;
  end if;

  insert into public.market_contact_replay_authority (
    authorization_nonce_hash,
    capability_id,
    request_id,
    requester_subject,
    owner_subject_ref,
    ad_id,
    sector_id,
    country,
    channel,
    policy_version,
    physics_version,
    reveal_policy_ref,
    reveal_authorized,
    issued_at,
    expires_at
  )
  values (
    p_authorization_nonce_hash,
    p_capability_id,
    p_request_id,
    p_requester_subject,
    p_owner_subject_ref,
    p_ad_id,
    p_sector_id,
    p_country,
    p_channel,
    p_policy_version,
    p_physics_version,
    p_reveal_policy_ref,
    coalesce(p_reveal_authorized, false),
    p_issued_at,
    p_expires_at
  )
  on conflict do nothing;

  get diagnostics v_rows = row_count;
  if v_rows <> 1 then
    return query select false, 'CONTACT_REPLAY_OR_CONFLICT'::text;
    return;
  end if;

  return query select true, 'CONTACT_CAPABILITY_ISSUED'::text;
end;
$$;

revoke all on function public.issue_market_contact_capability(
  text, text, text, text, text, text, text, text, text, text, text, text, boolean, timestamptz, timestamptz
) from public, anon, authenticated;
grant execute on function public.issue_market_contact_capability(
  text, text, text, text, text, text, text, text, text, text, text, text, boolean, timestamptz, timestamptz
) to service_role;

create or replace function public.consume_market_contact_capability(
  p_capability_id text,
  p_request_id text,
  p_requester_subject text,
  p_owner_subject_ref text,
  p_ad_id text,
  p_sector_id text,
  p_country text,
  p_channel text,
  p_policy_version text,
  p_physics_version text
)
returns table (
  ok boolean,
  reason_code text
)
language plpgsql
security definer set search_path = pg_catalog
as $$
declare
  v_rows integer := 0;
begin
  if p_capability_id is null
    or p_request_id is null
    or p_requester_subject is null
    or p_owner_subject_ref is null
    or p_ad_id is null
    or p_sector_id is null
    or p_country is null
    or p_channel is null
    or p_policy_version is null
    or p_physics_version is null then
    return query select false, 'HANDOFF_REPLAY_OR_CONFLICT'::text;
    return;
  end if;

  update public.market_contact_replay_authority set consumed_at = statement_timestamp() where capability_id = p_capability_id
    and request_id = p_request_id
    and requester_subject = p_requester_subject
    and owner_subject_ref = p_owner_subject_ref
    and ad_id = p_ad_id
    and sector_id = p_sector_id
    and country = p_country
    and channel = p_channel
    and policy_version = p_policy_version
    and physics_version = p_physics_version
    and consumed_at is null
    and expires_at > statement_timestamp();

  get diagnostics v_rows = row_count;
  if v_rows <> 1 then
    return query select false, 'HANDOFF_REPLAY_OR_CONFLICT'::text;
    return;
  end if;

  return query select true, 'HANDOFF_CAPABILITY_CONSUMED'::text;
end;
$$;

revoke all on function public.consume_market_contact_capability(
  text, text, text, text, text, text, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.consume_market_contact_capability(
  text, text, text, text, text, text, text, text, text, text
) to service_role;

commit;
