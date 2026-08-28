\set ON_ERROR_STOP on

create or replace function pg_temp.tiger_assert(ok boolean, code text)
returns void
language plpgsql
as $function$
begin
  if coalesce(ok, false) is not true then
    raise exception '%', code;
  end if;
end;
$function$;

-- Exact forward migration set required by the Sovereign Media Data Cell.
select pg_temp.tiger_assert(
  (select count(*) = 2
   from supabase_migrations.schema_migrations
   where version in ('20260816090001', '20260827120000')),
  'MEDIA_DB_REQUIRED_MIGRATIONS_MISSING'
);
\echo MEDIA_DB_MIGRATIONS=PASS

-- Trusted finalization job authority exists, is RLS-forced, and is not browser accessible.
select pg_temp.tiger_assert(to_regclass('public.vvip_media_finalization_jobs') is not null, 'MEDIA_DB_JOB_TABLE_MISSING');
select pg_temp.tiger_assert(
  exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'vvip_media_finalization_jobs'
      and c.relrowsecurity
      and c.relforcerowsecurity
  ),
  'MEDIA_DB_JOB_RLS_NOT_FORCED'
);
select pg_temp.tiger_assert(not has_table_privilege('anon', 'public.vvip_media_finalization_jobs', 'SELECT'), 'MEDIA_DB_JOB_ANON_PRIVILEGE');
select pg_temp.tiger_assert(not has_table_privilege('authenticated', 'public.vvip_media_finalization_jobs', 'SELECT'), 'MEDIA_DB_JOB_AUTH_PRIVILEGE');
select pg_temp.tiger_assert(has_table_privilege('service_role', 'public.vvip_media_finalization_jobs', 'SELECT,INSERT,UPDATE,DELETE'), 'MEDIA_DB_JOB_SERVICE_PRIVILEGE_MISSING');
\echo MEDIA_DB_JOB_TABLE=PASS

-- Canonical server-owned evidence columns must all exist on the marketplace media row.
with required(column_name) as (
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
)
select pg_temp.tiger_assert(
  (select count(*) = 11
   from required r
   join information_schema.columns c
     on c.table_schema = 'public'
    and c.table_name = 'vvip_marketplace_listing_media'
    and c.column_name = r.column_name),
  'MEDIA_DB_CANONICAL_COLUMNS_MISSING'
);
select pg_temp.tiger_assert(
  exists (
    select 1 from pg_trigger
    where tgrelid = 'public.vvip_marketplace_listing_media'::regclass
      and tgname = 'vvip_marketplace_guard_media_write'
      and not tgisinternal
  ),
  'MEDIA_DB_CANONICAL_WRITE_GUARD_MISSING'
);
select pg_temp.tiger_assert(
  exists (
    select 1 from pg_trigger
    where tgrelid = 'public.vvip_marketplace_listings'::regclass
      and tgname = 'vvip_marketplace_require_canonical_media'
      and not tgisinternal
  ),
  'MEDIA_DB_PUBLICATION_GUARD_MISSING'
);
\echo MEDIA_DB_CANONICAL_COLUMNS=PASS

-- Browser-facing request RPC: authenticated only, SECURITY DEFINER, fixed search path.
select pg_temp.tiger_assert(
  to_regprocedure('public.vvip_marketplace_request_media_finalization(uuid)') is not null,
  'MEDIA_DB_REQUEST_RPC_MISSING'
);
select pg_temp.tiger_assert(
  has_function_privilege('authenticated', 'public.vvip_marketplace_request_media_finalization(uuid)', 'EXECUTE'),
  'MEDIA_DB_REQUEST_RPC_AUTH_GRANT_MISSING'
);
select pg_temp.tiger_assert(
  not has_function_privilege('anon', 'public.vvip_marketplace_request_media_finalization(uuid)', 'EXECUTE'),
  'MEDIA_DB_REQUEST_RPC_ANON_GRANT'
);
select pg_temp.tiger_assert(
  exists (
    select 1
    from pg_proc p
    where p.oid = 'public.vvip_marketplace_request_media_finalization(uuid)'::regprocedure
      and p.prosecdef
      and array_to_string(coalesce(p.proconfig, array[]::text[]), ',') like '%search_path=pg_catalog, public, extensions%'
  ),
  'MEDIA_DB_REQUEST_RPC_SECURITY_CONTRACT_INVALID'
);
\echo MEDIA_DB_REQUEST_RPC=PASS

-- Trusted RPCs: service_role only; no browser or PUBLIC execute authority.
with required(signature) as (
  values
    ('public.vvip_marketplace_claim_media_finalization(uuid,text)'),
    ('public.vvip_marketplace_complete_media_finalization(uuid,text,text,text,text,text,integer,integer,integer,text)'),
    ('public.vvip_marketplace_fail_media_finalization(uuid,text,text)')
), resolved as (
  select signature, to_regprocedure(signature)::oid as oid
  from required
)
select pg_temp.tiger_assert(
  (select bool_and(
      oid is not null
      and has_function_privilege('service_role', oid, 'EXECUTE')
      and not has_function_privilege('anon', oid, 'EXECUTE')
      and not has_function_privilege('authenticated', oid, 'EXECUTE')
    ) from resolved),
  'MEDIA_DB_TRUSTED_RPC_GRANTS_INVALID'
);
with required(signature) as (
  values
    ('public.vvip_marketplace_claim_media_finalization(uuid,text)'),
    ('public.vvip_marketplace_complete_media_finalization(uuid,text,text,text,text,text,integer,integer,integer,text)'),
    ('public.vvip_marketplace_fail_media_finalization(uuid,text,text)')
)
select pg_temp.tiger_assert(
  (select bool_and(
      p.prosecdef
      and array_to_string(coalesce(p.proconfig, array[]::text[]), ',') like '%search_path=pg_catalog, public, extensions%'
      and not exists (
        select 1
        from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) acl
        where acl.grantee = 0 and acl.privilege_type = 'EXECUTE'
      )
    )
   from required r
   join pg_proc p on p.oid = to_regprocedure(r.signature)),
  'MEDIA_DB_TRUSTED_RPC_SECURITY_CONTRACT_INVALID'
);
\echo MEDIA_DB_TRUSTED_RPCS=PASS

-- Explicit RLS authority for the trusted job table and existing marketplace media table.
select pg_temp.tiger_assert(
  exists (
    select 1 from pg_class c
    where c.oid = 'public.vvip_media_finalization_jobs'::regclass and c.relrowsecurity and c.relforcerowsecurity
  ),
  'MEDIA_DB_RLS_JOB_INVALID'
);
select pg_temp.tiger_assert(
  exists (
    select 1 from pg_class c
    where c.oid = 'public.vvip_marketplace_listing_media'::regclass and c.relrowsecurity
  ),
  'MEDIA_DB_RLS_MEDIA_DISABLED'
);
\echo MEDIA_DB_RLS=PASS

-- Raw and canonical Storage authorities are private, MIME-bounded, and policy-scoped.
select pg_temp.tiger_assert(
  (select count(*) = 2
   from storage.buckets
   where id in ('listing-media', 'listing-media-canonical')
     and public is false
     and file_size_limit = 10485760
     and allowed_mime_types @> array['image/jpeg','image/webp']::text[]
     and cardinality(allowed_mime_types) = 2),
  'MEDIA_DB_STORAGE_BUCKET_CONTRACT_INVALID'
);
with required(policyname) as (
  values
    ('vvip_listing_media_storage_owner_insert'),
    ('vvip_listing_media_storage_owner_delete'),
    ('vvip_listing_media_raw_owner_read'),
    ('vvip_listing_media_canonical_read')
)
select pg_temp.tiger_assert(
  (select count(*) = 4
   from required r
   join pg_policies p
     on p.schemaname = 'storage'
    and p.tablename = 'objects'
    and p.policyname = r.policyname),
  'MEDIA_DB_STORAGE_POLICIES_MISSING'
);
select pg_temp.tiger_assert(
  not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'vvip_listing_media_storage_owner_update'
  ),
  'MEDIA_DB_RAW_STORAGE_UPDATE_POLICY_PRESENT'
);
\echo MEDIA_DB_STORAGE=PASS

-- Token hash, bounded retry lease, and one-live-job uniqueness are schema-enforced.
with required(column_name) as (
  values ('token_hash'), ('attempt_count'), ('expires_at'), ('lease_expires_at'), ('completed_at')
)
select pg_temp.tiger_assert(
  (select count(*) = 5
   from required r
   join information_schema.columns c
     on c.table_schema = 'public'
    and c.table_name = 'vvip_media_finalization_jobs'
    and c.column_name = r.column_name),
  'MEDIA_DB_TOKEN_LEASE_COLUMNS_MISSING'
);
select pg_temp.tiger_assert(
  exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and tablename = 'vvip_media_finalization_jobs'
      and indexname = 'vvip_media_finalization_one_live_job'
      and indexdef ilike '%unique%'
      and indexdef ilike '%REQUESTED%'
      and indexdef ilike '%PROCESSING%'
  ),
  'MEDIA_DB_ONE_LIVE_JOB_INDEX_INVALID'
);
select pg_temp.tiger_assert(
  exists (
    select 1
    from pg_constraint c
    where c.conrelid = 'public.vvip_media_finalization_jobs'::regclass
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) like '%attempt_count%3%'
  ),
  'MEDIA_DB_ATTEMPT_BOUND_MISSING'
);
select pg_temp.tiger_assert(
  exists (
    select 1
    from pg_constraint c
    where c.conrelid = 'public.vvip_media_finalization_jobs'::regclass
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) like '%token_hash%[0-9a-f]%64%'
  ),
  'MEDIA_DB_TOKEN_HASH_CONSTRAINT_MISSING'
);
\echo MEDIA_DB_TOKEN_LEASE=PASS

\echo TIGER_MEDIA_DB_CONTRACT=PASS
