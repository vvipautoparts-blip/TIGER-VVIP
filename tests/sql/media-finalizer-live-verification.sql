with
required_migrations(version) as (
  values ('20260816090001'), ('20260827120000')
),
migration_check as (
  select count(*) = 2 as ok
  from supabase_migrations.schema_migrations m
  join required_migrations r on r.version = m.version
),
job_table_check as (
  select
    to_regclass('public.vvip_media_finalization_jobs') is not null
    and exists (
      select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = 'vvip_media_finalization_jobs'
        and c.relrowsecurity
        and c.relforcerowsecurity
    )
    and not has_table_privilege('anon', 'public.vvip_media_finalization_jobs', 'SELECT')
    and not has_table_privilege('authenticated', 'public.vvip_media_finalization_jobs', 'SELECT')
    and has_table_privilege('service_role', 'public.vvip_media_finalization_jobs', 'SELECT,INSERT,UPDATE,DELETE') as ok
),
required_canonical_columns(column_name) as (
  values
    ('finalization_state'),
    ('canonical_storage_path'),
    ('canonical_sha256'),
    ('source_sha256'),
    ('canonical_mime_type'),
    ('canonical_byte_size'),
    ('canonical_width'),
    ('canonical_height'),
    ('canonical_verified_at'),
    ('canonical_verifier'),
    ('finalization_error_code')
),
canonical_columns_check as (
  select
    (select count(*) = 11
     from required_canonical_columns r
     join information_schema.columns c
       on c.table_schema = 'public'
      and c.table_name = 'vvip_marketplace_listing_media'
      and c.column_name = r.column_name)
    and exists (
      select 1
      from pg_trigger
      where tgrelid = 'public.vvip_marketplace_listing_media'::regclass
        and tgname = 'vvip_marketplace_guard_media_write'
        and not tgisinternal
    )
    and exists (
      select 1
      from pg_trigger
      where tgrelid = 'public.vvip_marketplace_listings'::regclass
        and tgname = 'vvip_marketplace_require_canonical_media'
        and not tgisinternal
    ) as ok
),
request_rpc_check as (
  select
    to_regprocedure('public.vvip_marketplace_request_media_finalization(uuid)') is not null
    and has_function_privilege('authenticated', 'public.vvip_marketplace_request_media_finalization(uuid)', 'EXECUTE')
    and not has_function_privilege('anon', 'public.vvip_marketplace_request_media_finalization(uuid)', 'EXECUTE')
    and exists (
      select 1
      from pg_proc p
      where p.oid = 'public.vvip_marketplace_request_media_finalization(uuid)'::regprocedure
        and p.prosecdef
        and array_to_string(coalesce(p.proconfig, array[]::text[]), ',') like '%search_path=pg_catalog, public, extensions%'
    ) as ok
),
required_trusted_rpcs(signature) as (
  values
    ('public.vvip_marketplace_claim_media_finalization(uuid,text)'),
    ('public.vvip_marketplace_complete_media_finalization(uuid,text,text,text,text,text,integer,integer,integer,text)'),
    ('public.vvip_marketplace_fail_media_finalization(uuid,text,text)')
),
trusted_rpc_rows as (
  select r.signature, p.oid, p.prosecdef, p.proconfig, p.proacl, p.proowner
  from required_trusted_rpcs r
  left join pg_proc p on p.oid = to_regprocedure(r.signature)
),
trusted_rpcs_check as (
  select bool_and(
    oid is not null
    and has_function_privilege('service_role', oid, 'EXECUTE')
    and not has_function_privilege('anon', oid, 'EXECUTE')
    and not has_function_privilege('authenticated', oid, 'EXECUTE')
    and prosecdef
    and array_to_string(coalesce(proconfig, array[]::text[]), ',') like '%search_path=pg_catalog, public, extensions%'
    and not exists (
      select 1
      from aclexplode(coalesce(proacl, acldefault('f', proowner))) acl
      where acl.grantee = 0 and acl.privilege_type = 'EXECUTE'
    )
  ) as ok
  from trusted_rpc_rows
),
rls_check as (
  select
    exists (
      select 1
      from pg_class c
      where c.oid = 'public.vvip_media_finalization_jobs'::regclass
        and c.relrowsecurity
        and c.relforcerowsecurity
    )
    and exists (
      select 1
      from pg_class c
      where c.oid = 'public.vvip_marketplace_listing_media'::regclass
        and c.relrowsecurity
        and c.relforcerowsecurity
    ) as ok
),
required_storage_policies(policyname) as (
  values
    ('vvip_listing_media_storage_owner_insert'),
    ('vvip_listing_media_storage_owner_delete'),
    ('vvip_listing_media_raw_owner_read'),
    ('vvip_listing_media_canonical_member_read')
),
storage_check as (
  select
    (select count(*) = 2
     from storage.buckets
     where id in ('listing-media', 'listing-media-canonical')
       and public is false
       and file_size_limit = 10485760
       and allowed_mime_types @> array['image/jpeg','image/webp']::text[]
       and cardinality(allowed_mime_types) = 2)
    and (select count(*) = 4
         from required_storage_policies r
         join pg_policies p
           on p.schemaname = 'storage'
          and p.tablename = 'objects'
          and p.policyname = r.policyname)
    and not exists (
      select 1
      from pg_policies
      where schemaname = 'storage'
        and tablename = 'objects'
        and policyname = 'vvip_listing_media_storage_owner_update'
    ) as ok
),
required_token_columns(column_name) as (
  values ('token_hash'), ('attempt_count'), ('expires_at'), ('lease_expires_at'), ('completed_at')
),
token_lease_check as (
  select
    (select count(*) = 5
     from required_token_columns r
     join information_schema.columns c
       on c.table_schema = 'public'
      and c.table_name = 'vvip_media_finalization_jobs'
      and c.column_name = r.column_name)
    and exists (
      select 1
      from pg_indexes
      where schemaname = 'public'
        and tablename = 'vvip_media_finalization_jobs'
        and indexname = 'vvip_media_finalization_one_live_job'
        and indexdef ilike '%unique%'
        and indexdef ilike '%REQUESTED%'
        and indexdef ilike '%PROCESSING%'
    )
    and exists (
      select 1
      from pg_constraint c
      where c.conrelid = 'public.vvip_media_finalization_jobs'::regclass
        and c.contype = 'c'
        and pg_get_constraintdef(c.oid) like '%attempt_count%3%'
    )
    and exists (
      select 1
      from pg_constraint c
      where c.conrelid = 'public.vvip_media_finalization_jobs'::regclass
        and c.contype = 'c'
        and pg_get_constraintdef(c.oid) like '%token_hash%[0-9a-f]%64%'
    ) as ok
),
checks as (
  select
    (select ok from migration_check) as migrations,
    (select ok from job_table_check) as job_table,
    (select ok from canonical_columns_check) as canonical_columns,
    (select ok from request_rpc_check) as request_rpc,
    (select ok from trusted_rpcs_check) as trusted_rpcs,
    (select ok from rls_check) as rls,
    (select ok from storage_check) as storage,
    (select ok from token_lease_check) as token_lease
)
select
  'zelcngyyvbomuzokvuxo'::text as project_ref,
  'ap-northeast-2'::text as region,
  array['20260816090001','20260827120000']::text[] as required_migrations,
  jsonb_build_object(
    'migrations', case when migrations then 'PASS' else 'FAIL' end,
    'jobTable', case when job_table then 'PASS' else 'FAIL' end,
    'canonicalColumns', case when canonical_columns then 'PASS' else 'FAIL' end,
    'requestRpc', case when request_rpc then 'PASS' else 'FAIL' end,
    'trustedRpcs', case when trusted_rpcs then 'PASS' else 'FAIL' end,
    'rls', case when rls then 'PASS' else 'FAIL' end,
    'storage', case when storage then 'PASS' else 'FAIL' end,
    'tokenLease', case when token_lease then 'PASS' else 'FAIL' end
  ) as contract_checks
from checks;
