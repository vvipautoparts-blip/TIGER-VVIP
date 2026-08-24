\set ON_ERROR_STOP on

begin;

reset role;

select (
  to_regclass('public.profiles') is null
  and to_regclass('public.vvip_social_profile_projection') is not null
) as profile_authority_converged
\gset
\if :profile_authority_converged
  \echo PROFILE_AUTHORITY_CONVERGED=PASS
\else
  \echo PROFILE_AUTHORITY_CONVERGED=FAIL
  \quit 1
\endif

select (
  not has_table_privilege('authenticated', 'public.vvip_social_profile_projection', 'SELECT')
  and not has_table_privilege('authenticated', 'public.vvip_social_profile_projection', 'INSERT')
  and not has_table_privilege('authenticated', 'public.vvip_social_profile_projection', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.vvip_social_profile_projection', 'DELETE')
  and not has_table_privilege('anon', 'public.vvip_social_profile_projection', 'SELECT')
  and has_function_privilege('authenticated', 'public.vvip_get_public_profile(uuid)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.vvip_get_public_profile(uuid)', 'EXECUTE')
) as public_profile_privilege_boundary
\gset
\if :public_profile_privilege_boundary
  \echo PUBLIC_PROFILE_PRIVILEGE_BOUNDARY=PASS
\else
  \echo PUBLIC_PROFILE_PRIVILEGE_BOUNDARY=FAIL
  \quit 1
\endif

insert into public.vvip_social_profile_projection (
  subject,
  profile_state,
  display_name,
  avatar_url,
  business_name,
  location,
  specialization,
  business_description
)
values (
  'user_profile_active',
  'active',
  'Active Profile',
  'https://example.invalid/avatar-active.png',
  'Active Business',
  'Amman',
  'Automotive',
  'Safe public presentation'
)
returning profile_id as active_profile_id
\gset

insert into public.vvip_social_profile_projection (
  subject,
  profile_state,
  display_name
)
values (
  'user_profile_deactivated',
  'deactivated',
  'Deactivated Profile'
)
returning profile_id as deactivated_profile_id
\gset

insert into public.vvip_social_profile_projection (
  subject,
  profile_state,
  display_name
)
values (
  'user_profile_deleted',
  'deleted',
  'Deleted Profile'
)
returning profile_id as deleted_profile_id
\gset

insert into public.vvip_social_profile_projection (
  subject,
  profile_state,
  display_name
)
values (
  'user_profile_viewer',
  'active',
  'Profile Viewer'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_profile_viewer"}', true);

select public.vvip_get_public_profile(:'active_profile_id'::uuid) as active_profile
\gset

select (
  :'active_profile'::jsonb->>'profile_id' = :'active_profile_id'
  and :'active_profile'::jsonb->>'display_name' = 'Active Profile'
  and :'active_profile'::jsonb->>'business_name' = 'Active Business'
  and :'active_profile'::jsonb->>'location' = 'Amman'
  and :'active_profile'::jsonb->>'specialization' = 'Automotive'
  and :'active_profile'::jsonb->>'business_description' = 'Safe public presentation'
  and not (:'active_profile'::jsonb ? 'subject')
  and not (:'active_profile'::jsonb ? 'clerk_user_id')
  and not (:'active_profile'::jsonb ? 'email')
  and not (:'active_profile'::jsonb ? 'phone')
  and not (:'active_profile'::jsonb ? 'profile_state')
  and not (:'active_profile'::jsonb ? 'subscription')
  and not (:'active_profile'::jsonb ? 'role')
  and not (:'active_profile'::jsonb ? 'is_approved')
) as public_profile_safe_projection
\gset
\if :public_profile_safe_projection
  \echo PUBLIC_PROFILE_SAFE_PROJECTION=PASS
\else
  \echo PUBLIC_PROFILE_SAFE_PROJECTION=FAIL
  \quit 1
\endif

select (
  public.vvip_get_public_profile(:'deactivated_profile_id'::uuid) is null
  and public.vvip_get_public_profile(:'deleted_profile_id'::uuid) is null
  and public.vvip_get_public_profile('00000000-0000-0000-0000-000000000001'::uuid) is null
) as public_profile_fail_closed
\gset
\if :public_profile_fail_closed
  \echo PUBLIC_PROFILE_FAIL_CLOSED=PASS
\else
  \echo PUBLIC_PROFILE_FAIL_CLOSED=FAIL
  \quit 1
\endif

rollback;
\echo TIGER_PUBLIC_PROFILE_PROJECTION_DB_BEHAVIOR=PASS
