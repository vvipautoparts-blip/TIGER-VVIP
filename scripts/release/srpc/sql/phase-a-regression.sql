-- SRPC v1 Phase A non-regression proof. Read-only.
with profile_state as (
    select
        c.oid is not null as exists,
        coalesce(c.relrowsecurity, false) as relrowsecurity,
        coalesce(c.relforcerowsecurity, false) as relforcerowsecurity
    from (select to_regclass('public.profiles') as oid) r
    left join pg_class c on c.oid = r.oid
),
profile_privileges as (
    select
        count(*) filter (
            where grantee = 'authenticated' and privilege_type = 'SELECT'
        ) as authenticated_select_count,
        count(*) filter (
            where grantee = 'anon'
               or (grantee = 'authenticated' and privilege_type <> 'SELECT')
        ) as browser_privilege_violation_count
    from information_schema.table_privileges
    where table_schema = 'public'
      and table_name = 'profiles'
      and grantee in ('anon','authenticated')
),
retired_targets(table_name) as (
    values ('otp_codes'), ('email_verifications'), ('vvip_clerk_profiles')
),
retired_state as (
    select
        t.table_name,
        c.oid is not null as exists,
        case when c.oid is null then true else c.relrowsecurity end as rls,
        case when c.oid is null then true else c.relforcerowsecurity end as force_rls,
        case when c.oid is null then 0 else (
            select count(*) from pg_policies p
            where p.schemaname = 'public' and p.tablename = t.table_name
        ) end as policy_count,
        case when c.oid is null then 0 else (
            select count(*) from information_schema.table_privileges tp
            where tp.table_schema = 'public'
              and tp.table_name = t.table_name
              and tp.grantee in ('anon','authenticated')
        ) end as browser_privilege_count
    from retired_targets t
    left join pg_namespace n on n.nspname = 'public'
    left join pg_class c on c.relnamespace = n.oid
                        and c.relname = t.table_name
                        and c.relkind in ('r','p')
),
helper_signatures(public_sig, private_sig) as (
    values
      ('public.user_role_for(uuid)', 'vvip_private.user_role_for(uuid)'),
      ('public.current_user_role()', 'vvip_private.current_user_role()'),
      ('public.is_field_representative()', 'vvip_private.is_field_representative()'),
      ('public.is_reviewer()', 'vvip_private.is_reviewer()'),
      ('public.is_super_admin()', 'vvip_private.is_super_admin()'),
      ('public.is_team_member(uuid)', 'vvip_private.is_team_member(uuid)'),
      ('public.can_publish_owner(uuid)', 'vvip_private.can_publish_owner(uuid)'),
      ('public.can_self_update_profile(uuid,text,boolean,uuid,text,text)', 'vvip_private.can_self_update_profile(uuid,text,boolean,uuid,text,text)')
),
helper_state as (
    select
        count(*) filter (where to_regprocedure(public_sig) is not null) as public_helper_count,
        count(*) filter (where to_regprocedure(private_sig) is not null) as private_helper_count
    from helper_signatures
),
duplicate_state as (
    select count(*) as duplicate_clerk_subject_groups
    from (
        select clerk_user_id
        from public.profiles
        where nullif(btrim(coalesce(clerk_user_id, '')), '') is not null
        group by clerk_user_id
        having count(*) > 1
    ) duplicates
),
summary as (
    select
        ps.exists as profiles_exists,
        ps.relrowsecurity as profiles_rls,
        ps.relforcerowsecurity as profiles_force_rls,
        pp.authenticated_select_count,
        pp.browser_privilege_violation_count,
        (select bool_and(rls and force_rls and policy_count = 0 and browser_privilege_count = 0) from retired_state) as retired_credentials_server_only,
        hs.public_helper_count,
        hs.private_helper_count,
        ds.duplicate_clerk_subject_groups
    from profile_state ps
    cross join profile_privileges pp
    cross join helper_state hs
    cross join duplicate_state ds
)
select jsonb_build_object(
    'status', case when
        s.profiles_exists
        and s.profiles_rls
        and s.profiles_force_rls
        and s.authenticated_select_count = 1
        and s.browser_privilege_violation_count = 0
        and s.retired_credentials_server_only
        and s.public_helper_count = 0
        and s.duplicate_clerk_subject_groups = 0
      then 'PASS' else 'FAIL' end,
    'profiles', jsonb_build_object(
        'exists', s.profiles_exists,
        'relrowsecurity', s.profiles_rls,
        'relforcerowsecurity', s.profiles_force_rls,
        'authenticated_select_count', s.authenticated_select_count,
        'browser_privilege_violation_count', s.browser_privilege_violation_count
    ),
    'retired_credentials_server_only', s.retired_credentials_server_only,
    'public_helper_count', s.public_helper_count,
    'private_helper_count', s.private_helper_count,
    'duplicate_clerk_subject_groups', s.duplicate_clerk_subject_groups,
    'retired_credential_detail', (
        select jsonb_agg(to_jsonb(r) order by r.table_name) from retired_state r
    )
) as srpc_phase_a_regression
from summary s;
