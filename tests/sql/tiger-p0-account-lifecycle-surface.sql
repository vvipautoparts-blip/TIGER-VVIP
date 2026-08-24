\set ON_ERROR_STOP on

begin;

reset role;
select (
  has_function_privilege('authenticated', 'public.vvip_social_get_my_lifecycle_state()', 'EXECUTE')
  and not has_function_privilege('anon', 'public.vvip_social_get_my_lifecycle_state()', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.vvip_deactivate_my_social_profile()', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.vvip_reactivate_my_social_profile()', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.vvip_mark_social_profile_deleted(text)', 'EXECUTE')
  and has_function_privilege('service_role', 'public.vvip_mark_social_profile_deleted(text)', 'EXECUTE')
  and not has_table_privilege('authenticated', 'public.vvip_social_profile_projection', 'SELECT')
  and not has_table_privilege('authenticated', 'public.vvip_social_profile_projection', 'INSERT')
  and not has_table_privilege('authenticated', 'public.vvip_social_profile_projection', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.vvip_social_profile_projection', 'DELETE')
) as account_lifecycle_rpc_boundary
\gset
\if :account_lifecycle_rpc_boundary
  \echo P0_ACCOUNT_LIFECYCLE_RPC_BOUNDARY=PASS
\else
  \echo P0_ACCOUNT_LIFECYCLE_RPC_BOUNDARY=FAIL
  select 1 / 0;
\endif

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_accountlife01"}', true);
select public.vvip_upsert_my_social_profile(
  'Account Lifecycle Tiger', null, null, 'Amman', null, 'Account lifecycle surface proof'
) as account_profile
\gset
select (:'account_profile'::jsonb->'profile'->>'profile_id') as account_profile_id
\gset
select public.vvip_social_get_my_lifecycle_state() as active_state
\gset
select (
  :'active_state'::jsonb->>'ok' = 'true'
  and :'active_state'::jsonb->>'state' = 'active'
  and :'active_state'::jsonb->>'profile_id' = :'account_profile_id'
  and (select count(*) from jsonb_object_keys(:'active_state'::jsonb)) = 3
  and not (:'active_state'::jsonb ? 'subject')
  and position('user_accountlife01' in :'active_state') = 0
) as account_active_ok
\gset
\if :account_active_ok
  \echo P0_ACCOUNT_LIFECYCLE_ACTIVE=PASS
\else
  \echo P0_ACCOUNT_LIFECYCLE_ACTIVE=FAIL
  select 1 / 0;
\endif

select public.vvip_deactivate_my_social_profile();
select public.vvip_social_get_my_lifecycle_state() as deactivated_state
\gset
select (
  :'deactivated_state'::jsonb->>'state' = 'deactivated'
  and :'deactivated_state'::jsonb->>'profile_id' = :'account_profile_id'
  and (select count(*) from jsonb_object_keys(:'deactivated_state'::jsonb)) = 3
  and position('user_accountlife01' in :'deactivated_state') = 0
) as account_deactivated_ok
\gset
\if :account_deactivated_ok
  \echo P0_ACCOUNT_LIFECYCLE_DEACTIVATED=PASS
\else
  \echo P0_ACCOUNT_LIFECYCLE_DEACTIVATED=FAIL
  select 1 / 0;
\endif

select public.vvip_reactivate_my_social_profile();
select public.vvip_social_get_my_lifecycle_state() as reactivated_state
\gset
select (
  :'reactivated_state'::jsonb->>'state' = 'active'
  and :'reactivated_state'::jsonb->>'profile_id' = :'account_profile_id'
  and (select count(*) from jsonb_object_keys(:'reactivated_state'::jsonb)) = 3
) as account_reactivated_ok
\gset
\if :account_reactivated_ok
  \echo P0_ACCOUNT_LIFECYCLE_REACTIVATED=PASS
\else
  \echo P0_ACCOUNT_LIFECYCLE_REACTIVATED=FAIL
  select 1 / 0;
\endif

do $proof$
begin
  begin
    perform public.vvip_mark_social_profile_deleted('user_accountlife01');
    raise exception 'P0_ACCOUNT_BROWSER_DELETE_ALLOWED';
  exception when insufficient_privilege then
    null;
  end;
end;
$proof$;

reset role;
set local role service_role;
select public.vvip_mark_social_profile_deleted('user_accountlife01') as deleted_profile
\gset

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_accountlife01"}', true);
select public.vvip_social_get_my_lifecycle_state() as deleted_state
\gset
select (
  :'deleted_profile'::jsonb->>'status' = 'profile_deleted'
  and :'deleted_state'::jsonb->>'state' = 'deleted'
  and :'deleted_state'::jsonb->>'profile_id' = :'account_profile_id'
  and (select count(*) from jsonb_object_keys(:'deleted_state'::jsonb)) = 3
  and not (:'deleted_state'::jsonb ? 'subject')
  and position('user_accountlife01' in :'deleted_state') = 0
) as account_deleted_ok
\gset
\if :account_deleted_ok
  \echo P0_ACCOUNT_LIFECYCLE_DELETED=PASS
\else
  \echo P0_ACCOUNT_LIFECYCLE_DELETED=FAIL
  select 1 / 0;
\endif

do $proof$
begin
  begin
    perform public.vvip_reactivate_my_social_profile();
    raise exception 'P0_ACCOUNT_DELETED_REACTIVATION_ALLOWED';
  exception when others then
    if sqlerrm <> 'SOCIAL_PROFILE_DELETED_TERMINAL' then raise; end if;
  end;
end;
$proof$;

select set_config('request.jwt.claims', '{}', true);
do $proof$
begin
  begin
    perform public.vvip_social_get_my_lifecycle_state();
    raise exception 'P0_ACCOUNT_ANONYMOUS_STATE_ALLOWED';
  exception when others then
    if sqlerrm <> 'SOCIAL_AUTH_REQUIRED' then raise; end if;
  end;
end;
$proof$;
\echo P0_ACCOUNT_LIFECYCLE_DENIALS=PASS

\echo TIGER_P0_ACCOUNT_LIFECYCLE_DB_BEHAVIOR=PASS

rollback;
