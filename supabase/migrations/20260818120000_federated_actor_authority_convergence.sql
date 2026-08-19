-- Reproduce the live federated actor authority from migration history.
-- This closes Production/staging drift without introducing local password authority.

begin;

create or replace function public.vvip_marketplace_actor_id()
returns text
language sql
stable
set search_path = pg_catalog, public
as $function$
  with claims as (
    select coalesce(
      nullif(current_setting('request.jwt.claims', true), '')::jsonb,
      '{}'::jsonb
    ) as value
  )
  select case
    when coalesce((claims.value ->> 'is_anonymous')::boolean, false) is false
      and nullif(claims.value ->> 'sub', '') like 'user\_%' escape '\'
      then nullif(claims.value ->> 'sub', '')
    else null
  end
  from claims;
$function$;

revoke all on function public.vvip_marketplace_actor_id() from public;
grant execute on function public.vvip_marketplace_actor_id() to anon, authenticated;

comment on function public.vvip_marketplace_actor_id() is
  'Federated Clerk actor binding: returns only non-anonymous user_* JWT subjects; no local password authority.';

commit;
