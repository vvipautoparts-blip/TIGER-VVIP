-- VVIP TIGER Social subject validation authority.
-- Forward-only dependency migration for Gate 3; no Production apply is authorized here.
-- Keeps the canonical Clerk subject invariant aligned with the existing Social Core user_* checks.

begin;

create or replace function public.vvip_social_subject_is_valid(
    p_subject text
)
returns boolean
language sql
immutable
parallel safe
set search_path = pg_catalog
as $function$
    select p_subject is not null
       and p_subject like 'user\_%' escape '\';
$function$;

revoke all on function public.vvip_social_subject_is_valid(text)
    from public, anon, authenticated;
grant execute on function public.vvip_social_subject_is_valid(text)
    to service_role;

comment on function public.vvip_social_subject_is_valid(text) is
    'Canonical Social Core Clerk subject validator for user_* actor identifiers.';

commit;
