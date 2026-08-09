from __future__ import annotations

REQUIRED_TABLES = {
    'vvip_authority_roles','vvip_authority_permissions','vvip_authority_principals',
    'vvip_authority_assignments','vvip_authority_assignment_revisions','vvip_country_authority_seals',
    'vvip_authorization_envelope_audit','vvip_authorization_audit_events',
    'vvip_marketplace_listings','vvip_marketplace_listing_media','vvip_marketplace_favorites',
    'vvip_marketplace_listing_audit',
}
REQUIRED_INDEXES = {
    'vvip_one_active_owner_root','vvip_authority_assignments_principal_state_idx',
    'vvip_authority_assignments_role_id_idx','vvip_marketplace_listings_public_idx',
    'vvip_marketplace_listings_owner_idx','vvip_marketplace_one_cover_per_listing',
    'vvip_marketplace_favorites_listing_id_idx',
}
REQUIRED_TRIGGERS = {
    'vvip_authority_principal_mutation_guard','vvip_authorization_audit_append_only_guard',
    'vvip_marketplace_listing_write_guard','vvip_marketplace_listing_audit_trigger',
    'vvip_marketplace_audit_append_only',
}
REQUIRED_POLICIES = {
    'vvip_marketplace_favorites_owner','vvip_marketplace_media_owner_delete',
    'vvip_marketplace_media_owner_insert','vvip_marketplace_media_owner_update',
    'vvip_marketplace_media_read','vvip_marketplace_authenticated_read',
    'vvip_marketplace_owner_delete','vvip_marketplace_owner_insert_draft',
    'vvip_marketplace_owner_update','vvip_marketplace_public_read_active',
    'vvip_listing_media_storage_owner_delete','vvip_listing_media_storage_owner_insert',
    'vvip_listing_media_storage_owner_update','vvip_listing_media_storage_read',
}
RESTRICTED_BROWSER_TABLES = {
    'vvip_authority_roles','vvip_authority_permissions','vvip_authority_principals',
    'vvip_authority_assignments','vvip_authority_assignment_revisions','vvip_country_authority_seals',
    'vvip_authorization_envelope_audit','vvip_authorization_audit_events',
    'vvip_marketplace_listing_audit',
}
EXPECTED_BROWSER_PRIVILEGES = {
    'vvip_marketplace_listings': {
        ('anon','SELECT'),
        ('authenticated','SELECT'),('authenticated','INSERT'),('authenticated','UPDATE'),('authenticated','DELETE'),
    },
    'vvip_marketplace_listing_media': {
        ('anon','SELECT'),
        ('authenticated','SELECT'),('authenticated','INSERT'),('authenticated','UPDATE'),('authenticated','DELETE'),
    },
    'vvip_marketplace_favorites': {
        ('authenticated','SELECT'),('authenticated','INSERT'),('authenticated','DELETE'),
    },
}
EXPECTED_FUNCTION_BROWSER_EXECUTE = {
    ('public','vvip_current_actor_id'): (False, False),
    ('public','vvip_guard_authority_principal_mutation'): (False, False),
    ('public','vvip_marketplace_actor_id'): (True, True),
    ('public','vvip_marketplace_guard_listing_write'): (False, False),
    ('public','vvip_marketplace_record_listing_audit'): (False, False),
    ('public','vvip_marketplace_reject_audit_mutation'): (False, False),
    ('public','vvip_marketplace_review_listing'): (False, True),
    ('public','vvip_reject_authorization_audit_mutation'): (False, False),
    ('vvip_private','vvip_marketplace_actor_can_review'): (False, False),
    ('vvip_private','vvip_marketplace_country_is_active'): (True, True),
}


def _missing(required: set[str], rows: list[dict], key: str) -> list[str]:
    present = {str(row.get(key, '')) for row in rows}
    return sorted(required - present)


def evaluate_fingerprint(fingerprint: dict) -> dict:
    failures: list[str] = []

    tables = list(fingerprint.get('tables') or [])
    for name in _missing(REQUIRED_TABLES, tables, 'table_name'):
        failures.append(f'MISSING_TABLE:{name}')
    for row in tables:
        name = str(row.get('table_name', ''))
        if name not in REQUIRED_TABLES:
            continue
        if row.get('exists') is not True:
            failures.append(f'TABLE_ABSENT:{name}')
        if row.get('rls') is not True:
            failures.append(f'RLS_DISABLED:{name}')
        if row.get('force_rls') is not True:
            failures.append(f'FORCE_RLS_DISABLED:{name}')

    for name in _missing(REQUIRED_INDEXES, list(fingerprint.get('indexes') or []), 'indexname'):
        failures.append(f'MISSING_INDEX:{name}')
    for name in _missing(REQUIRED_TRIGGERS, list(fingerprint.get('triggers') or []), 'trigger_name'):
        failures.append(f'MISSING_TRIGGER:{name}')
    for name in _missing(REQUIRED_POLICIES, list(fingerprint.get('policies') or []), 'policyname'):
        failures.append(f'MISSING_POLICY:{name}')

    buckets = list(fingerprint.get('storage_bucket') or [])
    if len(buckets) != 1:
        failures.append('BUCKET_COUNT_INVALID:listing-media')
    else:
        bucket = buckets[0]
        mime = set(bucket.get('allowed_mime_types') or [])
        if (
            bucket.get('id') != 'listing-media'
            or bucket.get('name') != 'listing-media'
            or bucket.get('public') is not False
            or bucket.get('file_size_limit') != 10485760
            or mime != {'image/jpeg','image/png','image/webp'}
        ):
            failures.append('BUCKET_CONTRACT_INVALID:listing-media')

    browser_rows = [
        row for row in list(fingerprint.get('table_privileges') or [])
        if row.get('grantee') in {'anon','authenticated'}
    ]
    for row in browser_rows:
        table = str(row.get('table_name', ''))
        if table in RESTRICTED_BROWSER_TABLES:
            failures.append(
                f"RESTRICTED_TABLE_BROWSER_PRIVILEGE:{table}:{row.get('grantee')}:{row.get('privilege_type')}"
            )

    for table, expected in EXPECTED_BROWSER_PRIVILEGES.items():
        actual = {
            (str(row.get('grantee')), str(row.get('privilege_type')))
            for row in browser_rows if row.get('table_name') == table
        }
        if actual != expected:
            failures.append(f'MARKETPLACE_PRIVILEGES_INVALID:{table}')

    function_rows = {
        (str(row.get('schema_name')), str(row.get('function_name'))): row
        for row in list(fingerprint.get('functions') or [])
    }
    for key, expected in EXPECTED_FUNCTION_BROWSER_EXECUTE.items():
        row = function_rows.get(key)
        if row is None:
            failures.append(f'MISSING_FUNCTION:{key[0]}.{key[1]}')
            continue
        actual = (row.get('anon_execute') is True, row.get('authenticated_execute') is True)
        if actual != expected:
            failures.append(f'FUNCTION_EXECUTE_INVALID:{key[0]}.{key[1]}')

    authority_counts = dict(fingerprint.get('authority_seed_counts') or {})
    nonzero_authority = sorted(k for k, value in authority_counts.items() if value != 0)
    if nonzero_authority:
        failures.append('NONZERO_AUTHORITY_ROWS:' + ','.join(nonzero_authority))

    marketplace_counts = dict(fingerprint.get('marketplace_row_counts') or {})
    nonzero_marketplace = sorted(k for k, value in marketplace_counts.items() if value != 0)
    if nonzero_marketplace:
        failures.append('NONZERO_MARKETPLACE_ROWS:' + ','.join(nonzero_marketplace))

    return {'canonical': not failures, 'failures': failures}
