import pytest

try:
    from tools.srpc.staging_contract import evaluate_fingerprint
except ModuleNotFoundError:
    evaluate_fingerprint = None

TABLES = [
    'vvip_authority_roles','vvip_authority_permissions','vvip_authority_principals',
    'vvip_authority_assignments','vvip_authority_assignment_revisions','vvip_country_authority_seals',
    'vvip_authorization_envelope_audit','vvip_authorization_audit_events',
    'vvip_marketplace_listings','vvip_marketplace_listing_media','vvip_marketplace_favorites',
    'vvip_marketplace_listing_audit',
]
INDEXES = [
    'vvip_one_active_owner_root','vvip_authority_assignments_principal_state_idx',
    'vvip_authority_assignments_role_id_idx','vvip_marketplace_listings_public_idx',
    'vvip_marketplace_listings_owner_idx','vvip_marketplace_one_cover_per_listing',
    'vvip_marketplace_favorites_listing_id_idx',
]
TRIGGERS = [
    'vvip_authority_principal_mutation_guard','vvip_authorization_audit_append_only_guard',
    'vvip_marketplace_listing_write_guard','vvip_marketplace_listing_audit_trigger',
    'vvip_marketplace_audit_append_only',
]
POLICIES = [
    'vvip_marketplace_favorites_owner','vvip_marketplace_media_owner_delete',
    'vvip_marketplace_media_owner_insert','vvip_marketplace_media_owner_update',
    'vvip_marketplace_media_read','vvip_marketplace_authenticated_read',
    'vvip_marketplace_owner_delete','vvip_marketplace_owner_insert_draft',
    'vvip_marketplace_owner_update','vvip_marketplace_public_read_active',
    'vvip_listing_media_storage_owner_delete','vvip_listing_media_storage_owner_insert',
    'vvip_listing_media_storage_owner_update','vvip_listing_media_storage_read',
]

def canonical_fingerprint():
    return {
        'tables': [{'table_name': name, 'exists': True, 'rls': True, 'force_rls': True} for name in TABLES],
        'indexes': [{'indexname': name} for name in INDEXES],
        'triggers': [{'trigger_name': name} for name in TRIGGERS],
        'policies': [{'policyname': name} for name in POLICIES],
        'storage_bucket': [{
            'id': 'listing-media', 'name': 'listing-media', 'public': False,
            'file_size_limit': 10485760,
            'allowed_mime_types': ['image/jpeg','image/png','image/webp'],
        }],
        'functions': [
            {'schema_name':'public','function_name':'vvip_current_actor_id','anon_execute':False,'authenticated_execute':False},
            {'schema_name':'public','function_name':'vvip_guard_authority_principal_mutation','anon_execute':False,'authenticated_execute':False},
            {'schema_name':'public','function_name':'vvip_marketplace_actor_id','anon_execute':True,'authenticated_execute':True},
            {'schema_name':'public','function_name':'vvip_marketplace_guard_listing_write','anon_execute':False,'authenticated_execute':False},
            {'schema_name':'public','function_name':'vvip_marketplace_record_listing_audit','anon_execute':False,'authenticated_execute':False},
            {'schema_name':'public','function_name':'vvip_marketplace_reject_audit_mutation','anon_execute':False,'authenticated_execute':False},
            {'schema_name':'public','function_name':'vvip_marketplace_review_listing','anon_execute':False,'authenticated_execute':True},
            {'schema_name':'public','function_name':'vvip_reject_authorization_audit_mutation','anon_execute':False,'authenticated_execute':False},
            {'schema_name':'vvip_private','function_name':'vvip_marketplace_actor_can_review','anon_execute':False,'authenticated_execute':False},
            {'schema_name':'vvip_private','function_name':'vvip_marketplace_country_is_active','anon_execute':True,'authenticated_execute':True},
        ],
        'table_privileges': [
            {'table_name':'vvip_marketplace_listings','grantee':'anon','privilege_type':'SELECT'},
            *[{'table_name':'vvip_marketplace_listings','grantee':'authenticated','privilege_type':p} for p in ['SELECT','INSERT','UPDATE','DELETE']],
            {'table_name':'vvip_marketplace_listing_media','grantee':'anon','privilege_type':'SELECT'},
            *[{'table_name':'vvip_marketplace_listing_media','grantee':'authenticated','privilege_type':p} for p in ['SELECT','INSERT','UPDATE','DELETE']],
            *[{'table_name':'vvip_marketplace_favorites','grantee':'authenticated','privilege_type':p} for p in ['SELECT','INSERT','DELETE']],
        ],
        'authority_seed_counts': {
            'roles':0,'permissions':0,'principals':0,'assignments':0,'assignment_revisions':0,
            'country_seals':0,'envelope_audit':0,'authorization_audit_events':0,
        },
        'marketplace_row_counts': {'listings':0,'media':0,'favorites':0,'listing_audit':0},
    }


def require_evaluator():
    assert evaluate_fingerprint is not None, 'tools.srpc.staging_contract must exist'


def test_canonical_fingerprint_passes():
    require_evaluator()
    result = evaluate_fingerprint(canonical_fingerprint())
    assert result == {'canonical': True, 'failures': []}

@pytest.mark.parametrize('field,name', [
    ('tables','vvip_marketplace_listings'),
    ('indexes','vvip_marketplace_one_cover_per_listing'),
    ('triggers','vvip_marketplace_listing_write_guard'),
    ('policies','vvip_listing_media_storage_read'),
])
def test_missing_required_object_fails(field, name):
    require_evaluator()
    fp = canonical_fingerprint()
    key = {'tables':'table_name','indexes':'indexname','triggers':'trigger_name','policies':'policyname'}[field]
    fp[field] = [row for row in fp[field] if row[key] != name]
    result = evaluate_fingerprint(fp)
    assert result['canonical'] is False
    assert any(name in failure for failure in result['failures'])


def test_rls_or_force_rls_false_fails():
    require_evaluator()
    fp = canonical_fingerprint()
    fp['tables'][0]['force_rls'] = False
    result = evaluate_fingerprint(fp)
    assert result['canonical'] is False
    assert any('FORCE_RLS' in failure for failure in result['failures'])


def test_public_bucket_fails():
    require_evaluator()
    fp = canonical_fingerprint()
    fp['storage_bucket'][0]['public'] = True
    result = evaluate_fingerprint(fp)
    assert result['canonical'] is False
    assert any('BUCKET' in failure for failure in result['failures'])


def test_browser_access_to_authority_table_fails():
    require_evaluator()
    fp = canonical_fingerprint()
    fp['table_privileges'].append({'table_name':'vvip_authority_roles','grantee':'authenticated','privilege_type':'SELECT'})
    result = evaluate_fingerprint(fp)
    assert result['canonical'] is False
    assert any('RESTRICTED_TABLE_BROWSER_PRIVILEGE' in failure for failure in result['failures'])


def test_missing_expected_marketplace_privilege_fails():
    require_evaluator()
    fp = canonical_fingerprint()
    fp['table_privileges'] = [row for row in fp['table_privileges'] if not (
        row['table_name']=='vvip_marketplace_listings' and row['grantee']=='authenticated' and row['privilege_type']=='INSERT'
    )]
    result = evaluate_fingerprint(fp)
    assert result['canonical'] is False
    assert any('MARKETPLACE_PRIVILEGES' in failure for failure in result['failures'])


def test_reviewer_helper_exposed_to_browser_fails():
    require_evaluator()
    fp = canonical_fingerprint()
    for row in fp['functions']:
        if row['function_name'] == 'vvip_marketplace_actor_can_review':
            row['authenticated_execute'] = True
    result = evaluate_fingerprint(fp)
    assert result['canonical'] is False
    assert any('FUNCTION_EXECUTE' in failure for failure in result['failures'])


def test_nonzero_seed_or_marketplace_rows_fail():
    require_evaluator()
    fp = canonical_fingerprint()
    fp['authority_seed_counts']['roles'] = 1
    fp['marketplace_row_counts']['listings'] = 1
    result = evaluate_fingerprint(fp)
    assert result['canonical'] is False
    assert any('NONZERO_AUTHORITY_ROWS' in failure for failure in result['failures'])
    assert any('NONZERO_MARKETPLACE_ROWS' in failure for failure in result['failures'])
