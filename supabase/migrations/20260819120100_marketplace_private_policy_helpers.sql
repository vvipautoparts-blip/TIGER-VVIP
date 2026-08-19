-- RLS policies call these bounded SECURITY DEFINER helpers.
-- Browser roles receive schema USAGE and exact EXECUTE only; no private-table authority is granted.
begin;

grant usage on schema vvip_private to anon,authenticated,service_role;
grant execute on function vvip_private.vvip_marketplace_country_is_active(text) to anon,authenticated,service_role;
grant execute on function vvip_private.vvip_marketplace_sector_is_active(text,text) to anon,authenticated,service_role;

commit;
