-- SRPC v1 Phase B structural fingerprint. Read-only; emits metadata and counts only.
with target_tables(schema_name, table_name) as (
    values
        ('public','vvip_authority_roles'),
        ('public','vvip_authority_permissions'),
        ('public','vvip_authority_principals'),
        ('public','vvip_authority_assignments'),
        ('public','vvip_authority_assignment_revisions'),
        ('public','vvip_country_authority_seals'),
        ('public','vvip_authorization_envelope_audit'),
        ('public','vvip_authorization_audit_events'),
        ('public','vvip_marketplace_listings'),
        ('public','vvip_marketplace_listing_media'),
        ('public','vvip_marketplace_favorites'),
        ('public','vvip_marketplace_listing_audit')
),
table_state as (
    select
        tt.schema_name,
        tt.table_name,
        c.oid is not null as exists,
        coalesce(c.relrowsecurity, false) as rls,
        coalesce(c.relforcerowsecurity, false) as force_rls
    from target_tables tt
    left join pg_namespace n on n.nspname = tt.schema_name
    left join pg_class c on c.relnamespace = n.oid
                        and c.relname = tt.table_name
                        and c.relkind in ('r','p')
),
function_state as (
    select
        n.nspname as schema_name,
        p.proname as function_name,
        pg_get_function_identity_arguments(p.oid) as identity_arguments,
        p.prosecdef as security_definer,
        p.proconfig as configuration,
        has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
        has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute,
        has_function_privilege('service_role', p.oid, 'EXECUTE') as service_role_execute
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where (n.nspname, p.proname) in (
        ('public','vvip_current_actor_id'),
        ('public','vvip_guard_authority_principal_mutation'),
        ('public','vvip_reject_authorization_audit_mutation'),
        ('public','vvip_marketplace_actor_id'),
        ('public','vvip_marketplace_guard_listing_write'),
        ('public','vvip_marketplace_record_listing_audit'),
        ('public','vvip_marketplace_reject_audit_mutation'),
        ('public','vvip_marketplace_review_listing'),
        ('vvip_private','vvip_marketplace_country_is_active'),
        ('vvip_private','vvip_marketplace_actor_can_review')
    )
),
trigger_state as (
    select
        n.nspname as schema_name,
        c.relname as table_name,
        t.tgname as trigger_name,
        pg_get_triggerdef(t.oid, true) as definition
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where not t.tgisinternal
      and t.tgname in (
        'vvip_authority_principal_mutation_guard',
        'vvip_authorization_audit_append_only_guard',
        'vvip_marketplace_listing_write_guard',
        'vvip_marketplace_listing_audit_trigger',
        'vvip_marketplace_audit_append_only'
      )
),
index_state as (
    select schemaname, tablename, indexname, indexdef
    from pg_indexes
    where schemaname = 'public'
      and indexname in (
        'vvip_one_active_owner_root',
        'vvip_authority_assignments_principal_state_idx',
        'vvip_authority_assignments_role_id_idx',
        'vvip_marketplace_listings_public_idx',
        'vvip_marketplace_listings_owner_idx',
        'vvip_marketplace_one_cover_per_listing',
        'vvip_marketplace_favorites_listing_id_idx'
      )
),
policy_state as (
    select schemaname, tablename, policyname, roles, cmd, qual, with_check
    from pg_policies
    where (
        schemaname = 'public'
        and tablename in (
            'vvip_marketplace_listings',
            'vvip_marketplace_listing_media',
            'vvip_marketplace_favorites',
            'vvip_marketplace_listing_audit'
        )
    ) or (
        schemaname = 'storage'
        and tablename = 'objects'
        and policyname like 'vvip_listing_media_storage_%'
    )
),
table_privilege_state as (
    select table_schema, table_name, grantee, privilege_type
    from information_schema.table_privileges
    where table_schema = 'public'
      and table_name in (
        'vvip_authority_roles',
        'vvip_authority_permissions',
        'vvip_authority_principals',
        'vvip_authority_assignments',
        'vvip_authority_assignment_revisions',
        'vvip_country_authority_seals',
        'vvip_authorization_envelope_audit',
        'vvip_authorization_audit_events',
        'vvip_marketplace_listings',
        'vvip_marketplace_listing_media',
        'vvip_marketplace_favorites',
        'vvip_marketplace_listing_audit'
      )
      and grantee in ('anon','authenticated','service_role')
),
routine_privilege_state as (
    select routine_schema, routine_name, grantee, privilege_type
    from information_schema.routine_privileges
    where routine_schema in ('public','vvip_private')
      and routine_name in (
        'vvip_current_actor_id',
        'vvip_guard_authority_principal_mutation',
        'vvip_reject_authorization_audit_mutation',
        'vvip_marketplace_actor_id',
        'vvip_marketplace_guard_listing_write',
        'vvip_marketplace_record_listing_audit',
        'vvip_marketplace_reject_audit_mutation',
        'vvip_marketplace_review_listing',
        'vvip_marketplace_country_is_active',
        'vvip_marketplace_actor_can_review'
      )
      and grantee in ('anon','authenticated','service_role')
)
select jsonb_build_object(
    'tables', (
        select coalesce(jsonb_agg(to_jsonb(s) order by s.schema_name, s.table_name), '[]'::jsonb)
        from table_state s
    ),
    'functions', (
        select coalesce(jsonb_agg(to_jsonb(s) order by s.schema_name, s.function_name, s.identity_arguments), '[]'::jsonb)
        from function_state s
    ),
    'triggers', (
        select coalesce(jsonb_agg(to_jsonb(s) order by s.schema_name, s.table_name, s.trigger_name), '[]'::jsonb)
        from trigger_state s
    ),
    'indexes', (
        select coalesce(jsonb_agg(to_jsonb(s) order by s.indexname), '[]'::jsonb)
        from index_state s
    ),
    'rls', (
        select jsonb_object_agg(s.table_name, s.rls order by s.table_name)
        from table_state s
    ),
    'force_rls', (
        select jsonb_object_agg(s.table_name, s.force_rls order by s.table_name)
        from table_state s
    ),
    'policies', (
        select coalesce(jsonb_agg(to_jsonb(s) order by s.schemaname, s.tablename, s.policyname), '[]'::jsonb)
        from policy_state s
    ),
    'table_privileges', (
        select coalesce(jsonb_agg(to_jsonb(s) order by s.table_name, s.grantee, s.privilege_type), '[]'::jsonb)
        from table_privilege_state s
    ),
    'function_privileges', (
        select coalesce(jsonb_agg(to_jsonb(s) order by s.routine_schema, s.routine_name, s.grantee), '[]'::jsonb)
        from routine_privilege_state s
    ),
    'storage_bucket', (
        select coalesce(jsonb_agg(jsonb_build_object(
            'id', b.id,
            'name', b.name,
            'public', b.public,
            'file_size_limit', b.file_size_limit,
            'allowed_mime_types', b.allowed_mime_types
        ) order by b.id), '[]'::jsonb)
        from storage.buckets b
        where b.id = 'listing-media'
    ),
    'authority_seed_counts', jsonb_build_object(
        'roles', (select count(*) from public.vvip_authority_roles),
        'permissions', (select count(*) from public.vvip_authority_permissions),
        'principals', (select count(*) from public.vvip_authority_principals),
        'assignments', (select count(*) from public.vvip_authority_assignments),
        'assignment_revisions', (select count(*) from public.vvip_authority_assignment_revisions),
        'country_seals', (select count(*) from public.vvip_country_authority_seals),
        'envelope_audit', (select count(*) from public.vvip_authorization_envelope_audit),
        'authorization_audit_events', (select count(*) from public.vvip_authorization_audit_events)
    ),
    'marketplace_row_counts', jsonb_build_object(
        'listings', (select count(*) from public.vvip_marketplace_listings),
        'media', (select count(*) from public.vvip_marketplace_listing_media),
        'favorites', (select count(*) from public.vvip_marketplace_favorites),
        'listing_audit', (select count(*) from public.vvip_marketplace_listing_audit)
    )
) as srpc_schema_fingerprint;
