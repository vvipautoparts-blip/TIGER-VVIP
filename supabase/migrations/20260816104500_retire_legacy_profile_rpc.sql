-- VVIP TIGER — retire the historical profile resolver RPC.
-- The legacy profiles table remains a Clerk read-only migration bridge only.
-- Convergence is idempotent when the retired RPC is already absent.

begin;

do $retire$
begin
  if to_regprocedure('public.vvip_resolve_own_profile(text)') is null then
    null;
  else
    execute 'revoke all on function public.vvip_resolve_own_profile(text) from public, anon, authenticated';
    execute 'drop function if exists public.vvip_resolve_own_profile(text)';
  end if;
end
$retire$;

commit;
