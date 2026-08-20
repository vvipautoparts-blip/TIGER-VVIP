\set ON_ERROR_STOP on

begin;

reset role;
select (
  not has_table_privilege('authenticated', 'public.vvip_social_profile_projection', 'SELECT')
  and not has_table_privilege('authenticated', 'public.vvip_social_profile_projection', 'INSERT')
  and not has_table_privilege('authenticated', 'public.vvip_social_profile_projection', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.vvip_social_profile_projection', 'DELETE')
) as owner_profile_no_direct_browser_crud
\gset
\if :owner_profile_no_direct_browser_crud
  \echo OWNER_PROFILE_NO_DIRECT_BROWSER_CRUD=PASS
\else
  \echo OWNER_PROFILE_NO_DIRECT_BROWSER_CRUD=FAIL
  \quit 1
\endif

select (
  has_function_privilege('authenticated', 'public.vvip_get_my_social_profile()', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.vvip_upsert_my_social_profile(text,text,text,text,text,text)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.vvip_get_my_social_profile()', 'EXECUTE')
  and not has_function_privilege('anon', 'public.vvip_upsert_my_social_profile(text,text,text,text,text,text)', 'EXECUTE')
) as owner_profile_rpc_boundary
\gset
\if :owner_profile_rpc_boundary
  \echo OWNER_PROFILE_RPC_BOUNDARY=PASS
\else
  \echo OWNER_PROFILE_RPC_BOUNDARY=FAIL
  \quit 1
\endif

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_alice01"}', true);
select public.vvip_upsert_my_social_profile(
  'Alice Tiger',
  'https://example.invalid/alice.png',
  'Alice Motors',
  'Amman',
  'Automotive',
  'Alice profile proof'
) as alice_saved
\gset

select (
  :'alice_saved'::jsonb->>'ok' = 'true'
  and :'alice_saved'::jsonb->>'status' = 'profile_saved'
  and :'alice_saved'::jsonb->'profile'->>'display_name' = 'Alice Tiger'
  and :'alice_saved'::jsonb->'profile'->>'profile_state' = 'active'
  and position('user_alice01' in :'alice_saved') = 0
) as alice_owner_create
\gset
\if :alice_owner_create
  \echo OWNER_PROFILE_SELF_CREATE=PASS
\else
  \echo OWNER_PROFILE_SELF_CREATE=FAIL
  \quit 1
\endif

select public.vvip_get_my_social_profile() as alice_loaded
\gset
select (
  :'alice_loaded'::jsonb->>'status' = 'profile_loaded'
  and :'alice_loaded'::jsonb->'profile'->>'display_name' = 'Alice Tiger'
  and position('user_alice01' in :'alice_loaded') = 0
) as alice_owner_read
\gset
\if :alice_owner_read
  \echo OWNER_PROFILE_SELF_READ=PASS
\else
  \echo OWNER_PROFILE_SELF_READ=FAIL
  \quit 1
\endif

reset role;
select profile_id as alice_profile_id
from public.vvip_social_profile_projection
where subject = 'user_alice01'
\gset

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_bob001"}', true);
select public.vvip_upsert_my_social_profile(
  'Bob Tiger',
  null,
  'Bob Motors',
  'Zarqa',
  'Parts',
  'Bob profile proof'
) as bob_saved
\gset

reset role;
select (
  (select display_name from public.vvip_social_profile_projection where profile_id = :'alice_profile_id'::uuid) = 'Alice Tiger'
  and (select count(*) from public.vvip_social_profile_projection where subject = 'user_alice01') = 1
  and (select count(*) from public.vvip_social_profile_projection where subject = 'user_bob001') = 1
) as owner_profiles_subject_isolated
\gset
\if :owner_profiles_subject_isolated
  \echo OWNER_PROFILE_CROSS_USER_ISOLATION=PASS
\else
  \echo OWNER_PROFILE_CROSS_USER_ISOLATION=FAIL
  \quit 1
\endif

update public.vvip_social_profile_projection
set profile_state = 'deactivated'
where subject = 'user_alice01';

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_alice01"}', true);
do $proof$
begin
  begin
    perform public.vvip_upsert_my_social_profile(
      'Alice Reactivate Attempt', null, null, null, null, null
    );
    raise exception 'TEST_EXPECTED_DEACTIVATED_MUTATION_DENIAL';
  exception when others then
    if sqlerrm <> 'SOCIAL_PROFILE_MUTATION_DISABLED' then
      raise;
    end if;
  end;
end;
$proof$;
\echo OWNER_PROFILE_DEACTIVATED_MUTATION_DENIED=PASS

reset role;
update public.vvip_social_profile_projection
set profile_state = 'deleted'
where subject = 'user_alice01';

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_alice01"}', true);
do $proof$
begin
  begin
    perform public.vvip_upsert_my_social_profile(
      'Alice Deleted Attempt', null, null, null, null, null
    );
    raise exception 'TEST_EXPECTED_DELETED_MUTATION_DENIAL';
  exception when others then
    if sqlerrm <> 'SOCIAL_PROFILE_MUTATION_DISABLED' then
      raise;
    end if;
  end;
end;
$proof$;
\echo OWNER_PROFILE_DELETED_MUTATION_DENIED=PASS

reset role;
select (
  profile_state = 'deleted'
  and display_name = 'Alice Tiger'
) as owner_profile_lifecycle_preserved
from public.vvip_social_profile_projection
where subject = 'user_alice01'
\gset
\if :owner_profile_lifecycle_preserved
  \echo OWNER_PROFILE_LIFECYCLE_PRESERVED=PASS
\else
  \echo OWNER_PROFILE_LIFECYCLE_PRESERVED=FAIL
  \quit 1
\endif

rollback;
\echo TIGER_PROFILE_OWNER_BOUNDARY_DB_BEHAVIOR=PASS
