-- VVIP TIGER — retire the historical profile resolver RPC.
-- The legacy profiles table remains a Clerk read-only migration bridge only.

begin;

revoke all on function public.vvip_resolve_own_profile(text)
from public, anon, authenticated;

drop function if exists public.vvip_resolve_own_profile(text);

commit;
