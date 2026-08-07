-- REVIEW ONLY — LOCAL ROLLBACK — DO NOT APPLY REMOTELY
-- Dependency-safe local review companion for the V13.1 authorization foundation.
-- This file is outside the migration chain and no automated script executes it.

begin;

revoke all on function public.vvip_reject_authorization_audit_mutation() from public;
revoke all on function public.vvip_reject_authorization_audit_mutation() from anon;
revoke all on function public.vvip_reject_authorization_audit_mutation() from authenticated;
revoke all on function public.vvip_guard_authority_principal_mutation() from public;
revoke all on function public.vvip_guard_authority_principal_mutation() from anon;
revoke all on function public.vvip_guard_authority_principal_mutation() from authenticated;
revoke all on function public.vvip_current_actor_id() from public;
revoke all on function public.vvip_current_actor_id() from anon;
revoke all on function public.vvip_current_actor_id() from authenticated;

drop trigger if exists vvip_authorization_audit_append_only_guard
    on public.vvip_authorization_audit_events;
drop trigger if exists vvip_authority_principal_mutation_guard
    on public.vvip_authority_principals;

drop function if exists public.vvip_reject_authorization_audit_mutation();
drop function if exists public.vvip_guard_authority_principal_mutation();
drop function if exists public.vvip_current_actor_id();

drop table if exists public.vvip_authorization_audit_events;
drop table if exists public.vvip_authorization_envelope_audit;
drop table if exists public.vvip_country_authority_seals;
drop table if exists public.vvip_authority_assignment_revisions;
drop table if exists public.vvip_authority_assignments;
drop table if exists public.vvip_authority_principals;
drop table if exists public.vvip_authority_permissions;
drop table if exists public.vvip_authority_roles;

commit;
