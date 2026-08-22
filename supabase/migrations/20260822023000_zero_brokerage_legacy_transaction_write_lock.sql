-- Issue #312 zero-brokerage hardening.
-- Preserve historical rows and tables, but make legacy transaction/commission
-- surfaces fail closed against all new mutations. Forward-only and idempotent.
-- Production application remains a separate promotion decision and is NOT
-- authorized by committing this migration.

begin;

create or replace function public.vvip_reject_legacy_brokerage_write()
returns trigger
language plpgsql
set search_path = pg_catalog
as $function$
begin
    raise exception using
        errcode = '42501',
        message = 'LEGACY_BROKERAGE_WRITE_RETIRED';
end
$function$;

revoke all on function public.vvip_reject_legacy_brokerage_write()
from public, anon, authenticated;

do $migration$
begin
    if to_regclass('public.orders') is distinct from null then
        execute 'revoke insert, update, delete on table public.orders from public, anon, authenticated';
        execute 'drop policy if exists "Users can insert own orders" on public.orders';
        execute 'drop policy if exists "Users can update own orders" on public.orders';
        execute 'drop trigger if exists vvip_zero_brokerage_write_lock on public.orders';
        execute 'create trigger vvip_zero_brokerage_write_lock before insert or update or delete on public.orders for each statement execute function public.vvip_reject_legacy_brokerage_write()';
    end if;

    if to_regclass('public.commissions') is distinct from null then
        execute 'revoke insert, update, delete on table public.commissions from public, anon, authenticated';
        execute 'drop policy if exists "Users can insert own commissions" on public.commissions';
        execute 'drop policy if exists "Users can update own commissions" on public.commissions';
        execute 'drop trigger if exists vvip_zero_brokerage_write_lock on public.commissions';
        execute 'create trigger vvip_zero_brokerage_write_lock before insert or update or delete on public.commissions for each statement execute function public.vvip_reject_legacy_brokerage_write()';
    end if;
end
$migration$;

commit;
