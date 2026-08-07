-- V14 marketplace hardening follow-up.
-- The listing audit trigger must be able to append while the audit table uses FORCE RLS.

create or replace function public.vvip_marketplace_record_listing_audit()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
begin
    if TG_OP = 'INSERT' or NEW.status is distinct from OLD.status then
        insert into public.vvip_marketplace_listing_audit (
            listing_id, actor_subject, previous_status, next_status, reason
        ) values (
            NEW.listing_id,
            public.vvip_marketplace_actor_id(),
            case when TG_OP = 'INSERT' then null else OLD.status end,
            NEW.status,
            NEW.rejection_reason
        );
    end if;
    return NEW;
end;
$function$;

revoke all on function public.vvip_marketplace_record_listing_audit() from public, anon, authenticated;
