-- TIGER VVIP SOA-01. Repository contract only: no PII, credentials, remote apply, or production activation.
set search_path = public;

create table if not exists public.soa_owner_authority_bindings (
  owner_authority_id uuid primary key,
  clerk_user_id text not null unique,
  authority_scope text not null default 'PLATFORM_OWNER',
  authority_status text not null default 'PENDING',
  authority_version bigint not null default 1,
  verified_at timestamptz, activated_at timestamptz, suspended_at timestamptz, revoked_at timestamptz,
  reason_code text not null, evidence_ref text,
  created_at timestamptz not null default clock_timestamp(), updated_at timestamptz not null default clock_timestamp(),
  constraint soa_owner_authority_scope_check check (authority_scope = 'PLATFORM_OWNER'),
  constraint soa_owner_authority_status_check check (authority_status in ('PENDING','VERIFIED','ACTIVE','SUSPENDED','REVOKED')),
  constraint soa_owner_authority_version_check check (authority_version > 0)
);
create unique index if not exists soa_owner_single_live_authority_idx on public.soa_owner_authority_bindings (authority_scope) where authority_status in ('VERIFIED','ACTIVE','SUSPENDED');

create table if not exists public.soa_owner_public_profiles (
  owner_authority_id uuid primary key references public.soa_owner_authority_bindings(owner_authority_id),
  public_display_name text, public_title text, public_country_code text, public_bio text, public_avatar_url text,
  verified_owner_badge boolean not null default false, approved_public_contact_url text,
  publication_status text not null default 'DRAFT', public_version bigint not null default 1,
  published_at timestamptz, published_by text,
  created_at timestamptz not null default clock_timestamp(), updated_at timestamptz not null default clock_timestamp(),
  constraint soa_owner_public_status_check check (publication_status in ('DRAFT','REVIEWED','PUBLISHED','WITHDRAWN')),
  constraint soa_owner_public_version_check check (public_version > 0)
);

create table if not exists public.soa_owner_private_vault (
  owner_authority_id uuid primary key references public.soa_owner_authority_bindings(owner_authority_id),
  encrypted_payload bytea not null, key_version text not null, cipher_suite text not null,
  classification text not null default 'OWNER_RESTRICTED', data_version bigint not null default 1, retention_policy text not null,
  created_at timestamptz not null default clock_timestamp(), updated_at timestamptz not null default clock_timestamp(),
  constraint soa_owner_private_data_version_check check (data_version > 0),
  constraint soa_owner_private_cipher_suite_check check (length(cipher_suite) between 3 and 128),
  constraint soa_owner_private_key_version_check check (length(key_version) between 1 and 128)
);

create table if not exists public.soa_owner_audit_events (
  event_id uuid primary key,
  owner_authority_id uuid references public.soa_owner_authority_bindings(owner_authority_id),
  actor_subject text, event_type text not null, correlation_id text not null, target_type text, target_id text,
  result_code text not null, metadata jsonb not null default '{}'::jsonb,
  previous_event_hash text, event_hash text not null, occurred_at timestamptz not null default clock_timestamp(),
  constraint soa_owner_audit_event_type_check check (length(event_type) between 3 and 128),
  constraint soa_owner_audit_hash_check check (length(event_hash) between 32 and 256)
);

create table if not exists public.soa_owner_authorization_leases (
  lease_id uuid primary key,
  owner_authority_id uuid not null references public.soa_owner_authority_bindings(owner_authority_id),
  clerk_user_id text not null, session_id text not null, action_code text not null, target_resource text not null,
  environment text not null, policy_version text not null, release_digest text not null, nonce text not null,
  issued_at timestamptz not null default clock_timestamp(), expires_at timestamptz not null,
  consumed_at timestamptz, revoked_at timestamptz,
  constraint soa_owner_lease_nonce_unique unique (nonce),
  constraint soa_owner_lease_environment_check check (environment in ('DEVELOPMENT','TEST','STAGING','PRODUCTION')),
  constraint soa_owner_lease_window_check check (expires_at > issued_at and expires_at <= issued_at + interval '120 seconds'),
  constraint soa_owner_lease_consumption_check check (consumed_at is null or consumed_at >= issued_at)
);

create table if not exists public.soa_owner_security_state (
  owner_authority_id uuid primary key references public.soa_owner_authority_bindings(owner_authority_id),
  kill_switch boolean not null default true, l4_enabled boolean not null default false,
  strong_factor_enrollment_confirmed boolean not null default false,
  security_hold_state text not null default 'ACTIVE', hold_until timestamptz,
  recovery_state text not null default 'NONE', last_reverified_at timestamptz,
  security_version bigint not null default 1,
  created_at timestamptz not null default clock_timestamp(), updated_at timestamptz not null default clock_timestamp(),
  constraint soa_owner_security_hold_check check (security_hold_state in ('CLEAR','ACTIVE','RECOVERY_PENDING')),
  constraint soa_owner_recovery_state_check check (recovery_state in ('NONE','PENDING','VERIFIED','COMPLETED','FAILED')),
  constraint soa_owner_security_version_check check (security_version > 0)
);

alter table public.soa_owner_authority_bindings enable row level security;
alter table public.soa_owner_authority_bindings force row level security;
alter table public.soa_owner_public_profiles enable row level security;
alter table public.soa_owner_public_profiles force row level security;
alter table public.soa_owner_private_vault enable row level security;
alter table public.soa_owner_private_vault force row level security;
alter table public.soa_owner_audit_events enable row level security;
alter table public.soa_owner_audit_events force row level security;
alter table public.soa_owner_authorization_leases enable row level security;
alter table public.soa_owner_authorization_leases force row level security;
alter table public.soa_owner_security_state enable row level security;
alter table public.soa_owner_security_state force row level security;

revoke all on table public.soa_owner_authority_bindings from public, anon, authenticated;
revoke all on table public.soa_owner_public_profiles from public, anon, authenticated;
revoke all on table public.soa_owner_private_vault from public, anon, authenticated;
revoke all on table public.soa_owner_audit_events from public, anon, authenticated;
revoke all on table public.soa_owner_authorization_leases from public, anon, authenticated;
revoke all on table public.soa_owner_security_state from public, anon, authenticated;
grant select on table public.soa_owner_public_profiles to anon, authenticated;
create policy soa_owner_public_profile_published_read on public.soa_owner_public_profiles for select to anon, authenticated using (publication_status = 'PUBLISHED');

create or replace function public.soa_reject_owner_audit_mutation()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  raise exception 'SOA_OWNER_AUDIT_APPEND_ONLY' using errcode = '55000';
end;
$$;
revoke all on function public.soa_reject_owner_audit_mutation() from public, anon, authenticated;
create trigger soa_owner_audit_append_only_guard before update or delete on public.soa_owner_audit_events for each row execute function public.soa_reject_owner_audit_mutation();

comment on table public.soa_owner_authority_bindings is 'Server-owned SOA authority. Legacy browser roles are not authority.';
comment on table public.soa_owner_public_profiles is 'Explicit public owner projection only.';
comment on table public.soa_owner_private_vault is 'Encrypted owner envelope; keys remain outside table/browser.';
comment on table public.soa_owner_audit_events is 'Append-only security metadata; no credential/vault plaintext.';
comment on table public.soa_owner_authorization_leases is 'Exact-bound short-lived L4 lease.';
comment on table public.soa_owner_security_state is 'Fail-closed: initial kill switch ON, L4 disabled.';
