-- TIGER VVIP LC-03 Supabase security hardening.
-- Scope: remove unnecessary public RPC exposure while preserving existing RLS behavior.
-- This migration is additive/idempotent and does not seed authority, country activation, secrets, or Production data.

begin;

create schema if not exists vvip_private;
revoke all on schema vvip_private from public, anon, authenticated;
grant usage on schema vvip_private to anon, authenticated;

comment on schema vvip_private is
  'TIGER VVIP internal database helpers. This schema is not an application API surface.';

-- Move internal V14 SECURITY DEFINER helpers out of the exposed public RPC schema.
-- ALTER ... SET SCHEMA preserves object identity, so parsed RLS/storage-policy dependencies
-- continue to target the same function OID without policy recreation.
do $migration$
begin
  if to_regprocedure('public.vvip_marketplace_country_is_active(text)') is not null then
    execute 'alter function public.vvip_marketplace_country_is_active(text) set schema vvip_private';
  end if;

  if to_regprocedure('public.vvip_marketplace_actor_can_review(text)') is not null then
    execute 'alter function public.vvip_marketplace_actor_can_review(text) set schema vvip_private';
  end if;
end
$migration$;

alter function vvip_private.vvip_marketplace_country_is_active(text)
  set search_path = pg_catalog;
alter function vvip_private.vvip_marketplace_actor_can_review(text)
  set search_path = pg_catalog;

revoke all on function vvip_private.vvip_marketplace_country_is_active(text)
  from public, anon, authenticated;
grant execute on function vvip_private.vvip_marketplace_country_is_active(text)
  to anon, authenticated;

revoke all on function vvip_private.vvip_marketplace_actor_can_review(text)
  from public, anon, authenticated;

-- PL/pgSQL bodies resolve qualified names at runtime, so rewire the two callers that
-- previously named the public helpers explicitly. Business rules are unchanged.
create or replace function public.vvip_marketplace_guard_listing_write()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $function$
declare
    actor text := public.vvip_marketplace_actor_id();
begin
    if actor is null and current_user in ('anon', 'authenticated') then
        raise exception 'MARKETPLACE_AUTH_REQUIRED';
    end if;

    if TG_OP = 'INSERT' then
        if current_user in ('anon', 'authenticated') then
            if NEW.owner_subject <> actor or NEW.status <> 'DRAFT' then
                raise exception 'MARKETPLACE_CLIENT_INSERT_DENIED';
            end if;
        end if;
    elsif TG_OP = 'UPDATE' then
        if NEW.owner_subject <> OLD.owner_subject
           or NEW.active_market_country <> OLD.active_market_country then
            raise exception 'MARKETPLACE_IMMUTABLE_SCOPE';
        end if;
        if current_user in ('anon', 'authenticated') then
            if OLD.owner_subject <> actor then
                raise exception 'MARKETPLACE_OWNER_REQUIRED';
            end if;
            if NEW.status in ('ACTIVE', 'EXPIRED', 'REJECTED', 'BLOCKED') then
                raise exception 'MARKETPLACE_TRUSTED_REVIEW_REQUIRED';
            end if;
            if not (
                (OLD.status = 'DRAFT' and NEW.status in ('DRAFT', 'PENDING_REVIEW', 'ARCHIVED'))
                or (OLD.status = 'REJECTED' and NEW.status in ('DRAFT', 'PENDING_REVIEW', 'ARCHIVED'))
                or (OLD.status = 'ACTIVE' and NEW.status in ('ACTIVE', 'PAUSED', 'ARCHIVED'))
                or (OLD.status = 'PAUSED' and NEW.status in ('PAUSED', 'PENDING_REVIEW', 'ARCHIVED'))
                or (OLD.status = 'ARCHIVED' and NEW.status = 'ARCHIVED')
            ) then
                raise exception 'MARKETPLACE_STATE_TRANSITION_DENIED';
            end if;
        end if;
    end if;

    if not vvip_private.vvip_marketplace_country_is_active(NEW.active_market_country) then
        raise exception 'MARKETPLACE_COUNTRY_NOT_ACTIVE';
    end if;

    NEW.updated_at := statement_timestamp();
    return NEW;
end;
$function$;

create or replace function public.vvip_marketplace_review_listing(
    target_listing uuid,
    decision text,
    decision_reason text default null
)
returns public.vvip_marketplace_listings
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
    current_listing public.vvip_marketplace_listings%rowtype;
    result public.vvip_marketplace_listings%rowtype;
begin
    select * into current_listing
    from public.vvip_marketplace_listings
    where listing_id = target_listing
    for update;

    if not found then
        raise exception 'MARKETPLACE_LISTING_NOT_FOUND';
    end if;
    if not vvip_private.vvip_marketplace_actor_can_review(current_listing.active_market_country) then
        raise exception 'MARKETPLACE_REVIEW_AUTHORITY_REQUIRED';
    end if;
    if current_listing.status <> 'PENDING_REVIEW' then
        raise exception 'MARKETPLACE_REVIEW_STATE_INVALID';
    end if;
    if decision not in ('APPROVE', 'REJECT', 'BLOCK') then
        raise exception 'MARKETPLACE_REVIEW_DECISION_INVALID';
    end if;
    if decision in ('REJECT', 'BLOCK') and nullif(btrim(decision_reason), '') is null then
        raise exception 'MARKETPLACE_REVIEW_REASON_REQUIRED';
    end if;

    update public.vvip_marketplace_listings
    set status = case decision
            when 'APPROVE' then 'ACTIVE'
            when 'REJECT' then 'REJECTED'
            else 'BLOCKED'
        end,
        rejection_reason = case when decision = 'APPROVE' then null else left(decision_reason, 500) end,
        published_at = case when decision = 'APPROVE' then statement_timestamp() else published_at end,
        updated_at = statement_timestamp()
    where listing_id = target_listing
    returning * into result;

    return result;
end;
$function$;

-- Preserve only the two intentional public SECURITY DEFINER application RPCs.
revoke all on function public.vvip_marketplace_review_listing(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.vvip_marketplace_review_listing(uuid, text, text)
  to authenticated;

alter function public.vvip_resolve_own_profile(text)
  set search_path = pg_catalog, public;
revoke all on function public.vvip_resolve_own_profile(text)
  from public, anon, authenticated;
grant execute on function public.vvip_resolve_own_profile(text)
  to authenticated;

-- Trigger functions are execution machinery, not RPC endpoints.
revoke all on function public.vvip_marketplace_guard_listing_write()
  from public, anon, authenticated;
revoke all on function public.vvip_marketplace_record_listing_audit()
  from public, anon, authenticated;
revoke all on function public.vvip_marketplace_reject_audit_mutation()
  from public, anon, authenticated;

-- Reconcile known Production legacy drift defensively. These objects are absent from a
-- fresh canonical build, so every change is conditional. Enumeration RPCs are fail-closed;
-- trigger/event-trigger helpers retain trigger behavior but lose browser RPC execution.
do $migration$
begin
  if to_regprocedure('public.lookup_profile_by_email(text)') is not null then
    execute 'revoke all on function public.lookup_profile_by_email(text) from public, anon, authenticated';
  end if;

  if to_regprocedure('public.lookup_profile_by_phone(text)') is not null then
    execute 'revoke all on function public.lookup_profile_by_phone(text) from public, anon, authenticated';
  end if;

  if to_regprocedure('public.handle_new_user()') is not null then
    execute 'alter function public.handle_new_user() set search_path = pg_catalog';
    execute 'revoke all on function public.handle_new_user() from public, anon, authenticated';
  end if;

  if to_regprocedure('public.set_profiles_updated_at()') is not null then
    execute 'alter function public.set_profiles_updated_at() set search_path = pg_catalog';
    execute 'revoke all on function public.set_profiles_updated_at() from public, anon, authenticated';
  end if;

  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'alter function public.rls_auto_enable() set search_path = pg_catalog';
    execute 'revoke all on function public.rls_auto_enable() from public, anon, authenticated';
  end if;

  if to_regprocedure('public.set_vvip_tiger_updated_at()') is not null then
    execute 'alter function public.set_vvip_tiger_updated_at() set search_path = pg_catalog';
    execute 'revoke all on function public.set_vvip_tiger_updated_at() from public, anon, authenticated';
  end if;

  if to_regprocedure('public.parts_sync_vehicle_reference_ids()') is not null then
    execute 'alter function public.parts_sync_vehicle_reference_ids() set search_path = pg_catalog';
    execute 'revoke all on function public.parts_sync_vehicle_reference_ids() from public, anon, authenticated';
  end if;

  if to_regprocedure('public.set_updated_at()') is not null then
    execute 'alter function public.set_updated_at() set search_path = pg_catalog';
    execute 'revoke all on function public.set_updated_at() from public, anon, authenticated';
  end if;
end
$migration$;

commit;
