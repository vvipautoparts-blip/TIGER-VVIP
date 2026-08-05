#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

if [ "${VVIP_ALLOW_LOCAL_SUPABASE_RESET:-0}" != "1" ]; then
    echo "LOCAL_RESET_DENIED=VVIP_ALLOW_LOCAL_SUPABASE_RESET_REQUIRED" >&2
    exit 64
fi

for command_name in supabase docker psql; do
    if ! command -v "$command_name" >/dev/null 2>&1; then
        echo "LOCAL_RESET_DENIED=MISSING_${command_name^^}" >&2
        exit 65
    fi
done

if ! docker info >/dev/null 2>&1; then
    echo "LOCAL_RESET_DENIED=DOCKER_UNAVAILABLE" >&2
    exit 66
fi

for linked_file in \
    "supabase/.temp/project-ref" \
    ".supabase/project-ref"; do
    if [ -s "$linked_file" ]; then
        echo "LOCAL_RESET_DENIED=LINKED_PROJECT_METADATA:$linked_file" >&2
        exit 67
    fi
done

for remote_variable in \
    DATABASE_URL \
    SUPABASE_DB_URL \
    SUPABASE_PROJECT_REF; do
    if [ -n "${!remote_variable:-}" ]; then
        echo "LOCAL_RESET_DENIED=REMOTE_VARIABLE_SET:$remote_variable" >&2
        exit 68
    fi
done

# Force libpq onto the standard Supabase local database. External libpq service
# configuration is removed so a caller cannot redirect this rehearsal remotely.
unset PGHOSTADDR PGSERVICE PGSERVICEFILE PGSSLMODE
export PGHOST=127.0.0.1
export PGPORT=54322
export PGUSER=postgres
export PGDATABASE=postgres
export PGPASSWORD=postgres

verify_local_authorization_foundation() {
    local results
    mapfile -t results < <(
        psql \
            --no-psqlrc \
            --set=ON_ERROR_STOP=1 \
            --tuples-only \
            --no-align <<'SQL'
select inet_server_addr()::text;
select inet_server_port();

select count(*)
from pg_catalog.pg_class c
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relname in (
    'vvip_authority_roles',
    'vvip_authority_permissions',
    'vvip_authority_principals',
    'vvip_authority_assignments',
    'vvip_authority_assignment_revisions',
    'vvip_country_authority_seals',
    'vvip_authorization_envelope_audit',
    'vvip_authorization_audit_events'
  );

select count(*)
from pg_catalog.pg_class c
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'vvip_authority_roles',
    'vvip_authority_permissions',
    'vvip_authority_principals',
    'vvip_authority_assignments',
    'vvip_authority_assignment_revisions',
    'vvip_country_authority_seals',
    'vvip_authorization_envelope_audit',
    'vvip_authorization_audit_events'
  )
  and c.relrowsecurity
  and c.relforcerowsecurity;

select
    (select count(*) from public.vvip_authority_roles)
  + (select count(*) from public.vvip_authority_permissions)
  + (select count(*) from public.vvip_authority_principals)
  + (select count(*) from public.vvip_authority_assignments)
  + (select count(*) from public.vvip_authority_assignment_revisions)
  + (select count(*) from public.vvip_country_authority_seals)
  + (select count(*) from public.vvip_authorization_envelope_audit)
  + (select count(*) from public.vvip_authorization_audit_events);

select count(*)
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in (
    'vvip_authority_roles',
    'vvip_authority_permissions',
    'vvip_authority_principals',
    'vvip_authority_assignments',
    'vvip_authority_assignment_revisions',
    'vvip_country_authority_seals',
    'vvip_authorization_envelope_audit',
    'vvip_authorization_audit_events'
  )
  and grantee in ('PUBLIC', 'anon', 'authenticated');

select count(*)
from information_schema.routine_privileges
where routine_schema = 'public'
  and routine_name in (
    'vvip_current_actor_id',
    'vvip_guard_authority_principal_mutation',
    'vvip_reject_authorization_audit_mutation'
  )
  and grantee in ('PUBLIC', 'anon', 'authenticated');

select count(*)
from pg_catalog.pg_trigger t
join pg_catalog.pg_class c on c.oid = t.tgrelid
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and not t.tgisinternal
  and t.tgname in (
    'vvip_authority_principal_mutation_guard',
    'vvip_authorization_audit_append_only_guard'
  );
SQL
    )

    local expected=(127.0.0.1 54322 8 8 0 0 0 2)
    if [ "${#results[@]}" -ne "${#expected[@]}" ]; then
        echo "LOCAL_AUTHORIZATION_VERIFY=UNEXPECTED_RESULT_COUNT" >&2
        printf 'RESULT=%s\n' "${results[@]}" >&2
        return 1
    fi

    local index
    for index in "${!expected[@]}"; do
        if [ "${results[$index]//[[:space:]]/}" != "${expected[$index]}" ]; then
            echo "LOCAL_AUTHORIZATION_VERIFY=MISMATCH:$index:${results[$index]}:${expected[$index]}" >&2
            return 1
        fi
    done

    echo "LOCAL_AUTHORIZATION_FOUNDATION=PASS"
}

supabase db reset --local
verify_local_authorization_foundation

supabase db reset --local
verify_local_authorization_foundation

echo "LOCAL_AUTHORIZATION_REPEATABILITY=PASS"
