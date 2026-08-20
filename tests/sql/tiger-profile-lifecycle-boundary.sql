\set ON_ERROR_STOP on

begin;

reset role;
select (
  not has_table_privilege('authenticated', 'public.vvip_social_profile_projection', 'SELECT')
  and not has_table_privilege('authenticated', 'public.vvip_social_profile_projection', 'INSERT')
  and not has_table_privilege('authenticated', 'public.vvip_social_profile_projection', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.vvip_social_profile_projection', 'DELETE')
) as lifecycle_no_direct_browser_crud
\gset
\if :lifecycle_no_direct_browser_crud
  \echo PROFILE_LIFECYCLE_NO_DIRECT_BROWSER_CRUD=PASS
\else
  \echo PROFILE_LIFECYCLE_NO_DIRECT_BROWSER_CRUD=FAIL
  \quit 1
\endif

select (
  has_function_privilege('authenticated', 'public.vvip_deactivate_my_social_profile()', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.vvip_reactivate_my_social_profile()', 'EXECUTE')
  and not has_function_privilege('anon', 'public.vvip_deactivate_my_social_profile()', 'EXECUTE')
  and not has_function_privilege('anon', 'public.vvip_reactivate_my_social_profile()', 'EXECUTE')
  and has_function_privilege('service_role', 'public.vvip_mark_social_profile_deleted(text)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.vvip_mark_social_profile_deleted(text)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.vvip_mark_social_profile_deleted(text)', 'EXECUTE')
) as lifecycle_rpc_boundary
\gset
\if :lifecycle_rpc_boundary
  \echo PROFILE_LIFECYCLE_RPC_BOUNDARY=PASS
\else
  \echo PROFILE_LIFECYCLE_RPC_BOUNDARY=FAIL
  \quit 1
\endif

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_lifecycle01"}', true);
select public.vvip_upsert_my_social_profile(
  'Lifecycle Tiger',
  'https://example.invalid/lifecycle.png',
  'Lifecycle Motors',
  'Amman',
  'Automotive',
  'Lifecycle boundary proof'
) as lifecycle_created
\gset
select (:'lifecycle_created'::jsonb->'profile'->>'profile_id') as lifecycle_profile_id
\gset
select (
  :'lifecycle_created'::jsonb->>'status' = 'profile_saved'
  and :'lifecycle_created'::jsonb->'profile'->>'profile_state' = 'active'
  and position('user_lifecycle01' in :'lifecycle_created') = 0
) as lifecycle_create_ok
\gset
\if :lifecycle_create_ok
  \echo PROFILE_LIFECYCLE_CREATE_ACTIVE=PASS
\else
  \echo PROFILE_LIFECYCLE_CREATE_ACTIVE=FAIL
  \quit 1
\endif

select public.vvip_deactivate_my_social_profile() as lifecycle_deactivated
\gset
select (
  :'lifecycle_deactivated'::jsonb->>'status' = 'profile_deactivated'
  and :'lifecycle_deactivated'::jsonb->'profile'->>'profile_state' = 'deactivated'
  and :'lifecycle_deactivated'::jsonb->'profile'->>'profile_id' = :'lifecycle_profile_id'
  and :'lifecycle_deactivated'::jsonb->'profile'->>'display_name' = 'Lifecycle Tiger'
  and position('user_lifecycle01' in :'lifecycle_deactivated') = 0
) as lifecycle_deactivate_ok
\gset
\if :lifecycle_deactivate_ok
  \echo PROFILE_LIFECYCLE_SELF_DEACTIVATE=PASS
\else
  \echo PROFILE_LIFECYCLE_SELF_DEACTIVATE=FAIL
  \quit 1
\endif

select public.vvip_deactivate_my_social_profile() as lifecycle_deactivated_again
\gset
select (
  :'lifecycle_deactivated_again'::jsonb->>'status' = 'profile_deactivated'
  and :'lifecycle_deactivated_again'::jsonb->'profile'->>'profile_state' = 'deactivated'
  and :'lifecycle_deactivated_again'::jsonb->'profile'->>'profile_id' = :'lifecycle_profile_id'
) as lifecycle_deactivate_idempotent
\gset
\if :lifecycle_deactivate_idempotent
  \echo PROFILE_LIFECYCLE_DEACTIVATE_IDEMPOTENT=PASS
\else
  \echo PROFILE_LIFECYCLE_DEACTIVATE_IDEMPOTENT=FAIL
  \quit 1
\endif

select public.vvip_get_public_profile(:'lifecycle_profile_id'::uuid) is null as lifecycle_public_hidden_while_deactivated
\gset
\if :lifecycle_public_hidden_while_deactivated
  \echo PROFILE_LIFECYCLE_DEACTIVATED_PUBLIC_HIDDEN=PASS
\else
  \echo PROFILE_LIFECYCLE_DEACTIVATED_PUBLIC_HIDDEN=FAIL
  \quit 1
\endif

do $proof$
begin
  begin
    perform public.vvip_upsert_my_social_profile('Lifecycle Mutation Attempt', null, null, null, null, null);
    raise exception 'TEST_EXPECTED_DEACTIVATED_MUTATION_DENIAL';
  exception when others then
    if upper(sqlerrm) <> 'SOCIAL_PROFILE_MUTATION_DISABLED' then
      raise;
    end if;
  end;
end;
$proof$;
\echo PROFILE_LIFECYCLE_DEACTIVATED_MUTATION_DENIED=PASS

select public.vvip_reactivate_my_social_profile() as lifecycle_reactivated
\gset
select (
  :'lifecycle_reactivated'::jsonb->>'status' = 'profile_active'
  and :'lifecycle_reactivated'::jsonb->'profile'->>'profile_state' = 'active'
  and :'lifecycle_reactivated'::jsonb->'profile'->>'profile_id' = :'lifecycle_profile_id'
  and :'lifecycle_reactivated'::jsonb->'profile'->>'display_name' = 'Lifecycle Tiger'
  and position('user_lifecycle01' in :'lifecycle_reactivated') = 0
) as lifecycle_reactivate_ok
\gset
\if :lifecycle_reactivate_ok
  \echo PROFILE_LIFECYCLE_SELF_REACTIVATE=PASS
\else
  \echo PROFILE_LIFECYCLE_SELF_REACTIVATE=FAIL
  \quit 1
\endif

select public.vvip_reactivate_my_social_profile() as lifecycle_reactivated_again
\gset
select (
  :'lifecycle_reactivated_again'::jsonb->>'status' = 'profile_active'
  and :'lifecycle_reactivated_again'::jsonb->'profile'->>'profile_id' = :'lifecycle_profile_id'
) as lifecycle_reactivate_idempotent
\gset
\if :lifecycle_reactivate_idempotent
  \echo PROFILE_LIFECYCLE_REACTIVATE_IDEMPOTENT=PASS
\else
  \echo PROFILE_LIFECYCLE_REACTIVATE_IDEMPOTENT=FAIL
  \quit 1
\endif

select public.vvip_get_public_profile(:'lifecycle_profile_id'::uuid) is not null as lifecycle_public_visible_after_reactivation
\gset
\if :lifecycle_public_visible_after_reactivation
  \echo PROFILE_LIFECYCLE_REACTIVATED_PUBLIC_VISIBLE=PASS
\else
  \echo PROFILE_LIFECYCLE_REACTIVATED_PUBLIC_VISIBLE=FAIL
  \quit 1
\endif

do $proof$
begin
  begin
    perform public.vvip_mark_social_profile_deleted('user_lifecycle01');
    raise exception 'TEST_EXPECTED_BROWSER_DELETE_DENIAL';
  exception when insufficient_privilege then
    null;
  end;
end;
$proof$;
\echo PROFILE_LIFECYCLE_BROWSER_DELETE_DENIED=PASS

reset role;
set local role service_role;
select public.vvip_mark_social_profile_deleted('user_lifecycle01') as lifecycle_deleted
\gset
select (
  :'lifecycle_deleted'::jsonb->>'status' = 'profile_deleted'
  and :'lifecycle_deleted'::jsonb->'profile'->>'profile_state' = 'deleted'
  and :'lifecycle_deleted'::jsonb->'profile'->>'profile_id' = :'lifecycle_profile_id'
  and :'lifecycle_deleted'::jsonb->'profile'->>'display_name' = 'Deleted member'
  and position('user_lifecycle01' in :'lifecycle_deleted') = 0
) as lifecycle_delete_ok
\gset
\if :lifecycle_delete_ok
  \echo PROFILE_LIFECYCLE_TRUSTED_DELETE=PASS
\else
  \echo PROFILE_LIFECYCLE_TRUSTED_DELETE=FAIL
  \quit 1
\endif

reset role;
select (
  profile_id = :'lifecycle_profile_id'::uuid
  and profile_state = 'deleted'
  and display_name = 'Deleted member'
  and avatar_url is null
  and business_name is null
  and location is null
  and specialization is null
  and business_description is null
) as lifecycle_tombstone_ok
from public.vvip_social_profile_projection
where subject = 'user_lifecycle01'
\gset
\if :lifecycle_tombstone_ok
  \echo PROFILE_LIFECYCLE_DELETE_TOMBSTONE=PASS
\else
  \echo PROFILE_LIFECYCLE_DELETE_TOMBSTONE=FAIL
  \quit 1
\endif

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_lifecycle01"}', true);
select public.vvip_get_public_profile(:'lifecycle_profile_id'::uuid) is null as lifecycle_public_hidden_after_delete
\gset
\if :lifecycle_public_hidden_after_delete
  \echo PROFILE_LIFECYCLE_DELETED_PUBLIC_HIDDEN=PASS
\else
  \echo PROFILE_LIFECYCLE_DELETED_PUBLIC_HIDDEN=FAIL
  \quit 1
\endif

do $proof$
begin
  begin
    perform public.vvip_reactivate_my_social_profile();
    raise exception 'TEST_EXPECTED_DELETED_REACTIVATION_DENIAL';
  exception when others then
    if upper(sqlerrm) <> 'SOCIAL_PROFILE_DELETED_TERMINAL' then
      raise;
    end if;
  end;
end;
$proof$;
\echo PROFILE_LIFECYCLE_DELETED_REACTIVATION_DENIED=PASS

do $proof$
begin
  begin
    perform public.vvip_upsert_my_social_profile('Deleted Mutation Attempt', null, null, null, null, null);
    raise exception 'TEST_EXPECTED_DELETED_MUTATION_DENIAL';
  exception when others then
    if upper(sqlerrm) <> 'SOCIAL_PROFILE_MUTATION_DISABLED' then
      raise;
    end if;
  end;
end;
$proof$;
\echo PROFILE_LIFECYCLE_DELETED_MUTATION_DENIED=PASS

rollback;
\echo TIGER_PROFILE_LIFECYCLE_BOUNDARY_DB_BEHAVIOR=PASS
