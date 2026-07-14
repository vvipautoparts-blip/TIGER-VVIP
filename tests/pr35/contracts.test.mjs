import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ROLE_IDS, PERMISSION_IDS, ROLE_TEMPLATES, SCOPE_LEVELS,
  ASSIGNMENT_STATES, ERROR_CODES, LIMITS, validatePageRequest,
  validateCorrelationKey, validateIdempotencyKey
} from '../../scripts/pr35/pr35-contracts.js';

test('canonical catalogs are exact, unique, and deeply frozen', () => {
  assert.deepEqual(SCOPE_LEVELS, ['platform', 'sector', 'region', 'area', 'team']);
  assert.deepEqual(ASSIGNMENT_STATES, ['pending', 'active', 'suspended', 'revoked', 'expired']);
  assert.deepEqual(ROLE_IDS, ['owner', 'platform_admin', 'sector_manager', 'regional_manager',
    'area_manager', 'group_manager', 'campaign_manager', 'sales', 'marketing',
    'tiger_care', 'moderator', 'service_provider', 'regular_user']);
  assert.equal(new Set(PERMISSION_IDS).size, PERMISSION_IDS.length);
  assert.ok(PERMISSION_IDS.includes('authorization.owner.manage'));
  assert.ok(PERMISSION_IDS.includes('audit.event.append'));
  assert.ok(Object.isFrozen(ROLE_TEMPLATES));
  assert.ok(Object.values(ROLE_TEMPLATES).every(Object.isFrozen));
  assert.throws(() => ROLE_TEMPLATES.owner.permissionIds.push('bad'), TypeError);
});

test('role templates are bundles and every bundled permission is canonical', () => {
  for (const [roleId, template] of Object.entries(ROLE_TEMPLATES)) {
    assert.ok(ROLE_IDS.includes(roleId));
    assert.ok(template.permissionIds.every((id) => PERMISSION_IDS.includes(id)));
  }
  assert.ok(ROLE_TEMPLATES.owner.permissionIds.includes('authorization.owner.manage'));
  assert.ok(!ROLE_TEMPLATES.platform_admin.permissionIds.includes('authorization.owner.manage'));
});

test('bounded page and opaque operation keys return deterministic codes', () => {
  assert.deepEqual(validatePageRequest({ limit: 999, cursor: 'next' }),
    { ok: false, code: ERROR_CODES.PAGE_LIMIT_EXCEEDED });
  assert.deepEqual(validatePageRequest({ limit: 20, cursor: 'x'.repeat(LIMITS.CURSOR + 1) }),
    { ok: false, code: ERROR_CODES.FIELD_TOO_LONG });
  assert.deepEqual(validatePageRequest({ limit: 20 }), { ok: true, code: 'OK', value: { limit: 20, cursor: null } });
  assert.equal(validateCorrelationKey('corr_Abc-123').ok, true);
  assert.equal(validateIdempotencyKey('idem_Abc-123').ok, true);
  assert.deepEqual(validateCorrelationKey('bad key'), { ok: false, code: ERROR_CODES.INVALID_CORRELATION_KEY });
  assert.deepEqual(validateIdempotencyKey('x'.repeat(129)), { ok: false, code: ERROR_CODES.INVALID_IDEMPOTENCY_KEY });
});
