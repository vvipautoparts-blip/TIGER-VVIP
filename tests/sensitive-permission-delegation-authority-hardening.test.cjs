'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const contract = require('../scripts/security/sensitive-permission-contract.js');

const NOW = '2026-08-23T00:00:00.000Z';
const LATER = '2026-08-23T12:00:00.000Z';
const TOMORROW = '2026-08-24T00:00:00.000Z';

function delegationInput(overrides = {}) {
  return {
    principal: 'partner:alpha',
    action: 'DELEGATE_PERMISSION',
    resource_scope: { kind: 'sector', ids: ['food'] },
    sector_scope: ['food'],
    entity_scope: ['entity:alpha'],
    geo_policy_scope: ['JO'],
    purpose: 'bounded delegation authority',
    reason: 'OWNER_APPROVED_DELEGATION',
    grantor: 'owner:root',
    policy_version: '2026-08-22',
    issued_at: NOW,
    not_before: NOW,
    expires_at: TOMORROW,
    delegability_ceiling: {
      actions: ['VIEW_FINANCIAL_EARNINGS'],
      resource_scope: { kind: 'sector', ids: ['food'] },
      sector_scope: ['food'],
      entity_scope: ['entity:alpha'],
      geo_policy_scope: ['JO'],
      expires_at: TOMORROW,
    },
    audit_evidence_ref: 'audit:delegation:001',
    status: 'ACTIVE',
    revoked_at: null,
    ...overrides,
  };
}

function childInput(overrides = {}) {
  return {
    principal: 'partner:beta',
    action: 'VIEW_FINANCIAL_EARNINGS',
    resource_scope: { kind: 'sector', ids: ['automotive'] },
    sector_scope: ['automotive'],
    entity_scope: ['entity:alpha'],
    geo_policy_scope: ['JO'],
    purpose: 'delegated visibility',
    reason: 'SCOPED_DELEGATION',
    grantor: 'partner:alpha',
    policy_version: '2026-08-22',
    issued_at: NOW,
    not_before: NOW,
    expires_at: TOMORROW,
    delegability_ceiling: {
      actions: [],
      resource_scope: { kind: 'sector', ids: [] },
      sector_scope: [],
      entity_scope: [],
      geo_policy_scope: [],
      expires_at: TOMORROW,
    },
    audit_evidence_ref: 'audit:delegation:002',
    status: 'ACTIVE',
    revoked_at: null,
    ...overrides,
  };
}

test('a grant cannot declare a delegability ceiling broader than its own authority', () => {
  const invalidCeilings = [
    {
      ...delegationInput().delegability_ceiling,
      sector_scope: ['food', 'automotive'],
    },
    {
      ...delegationInput().delegability_ceiling,
      entity_scope: ['entity:alpha', 'entity:beta'],
    },
    {
      ...delegationInput().delegability_ceiling,
      geo_policy_scope: ['JO', 'US'],
    },
    {
      ...delegationInput().delegability_ceiling,
      resource_scope: { kind: 'sector', ids: ['food', 'automotive'] },
    },
    {
      ...delegationInput().delegability_ceiling,
      expires_at: '2026-08-25T00:00:00.000Z',
    },
  ];

  for (const delegability_ceiling of invalidCeilings) {
    assert.throws(
      () => contract.createSensitiveGrant(delegationInput({ delegability_ceiling })),
      /delegability|ceiling|scope|expires/i,
    );
  }
});

test('canDelegate fails closed if a malformed legacy grant has a ceiling wider than its actual grant scope', () => {
  const validGrantor = contract.createSensitiveGrant(delegationInput());
  const malformedLegacyGrantor = Object.freeze({
    ...validGrantor,
    delegability_ceiling: Object.freeze({
      ...validGrantor.delegability_ceiling,
      resource_scope: Object.freeze({ kind: 'sector', ids: Object.freeze(['food', 'automotive']) }),
      sector_scope: Object.freeze(['food', 'automotive']),
    }),
  });
  const requested = contract.createSensitiveGrant(childInput());

  assert.equal(
    contract.canDelegate(malformedLegacyGrantor, requested, LATER),
    false,
    'requested authority must fit both grantor actual scope and its ceiling',
  );
});

test('database insert guard enforces delegability ceiling within immutable grant authority', () => {
  const migrationPath = path.join(
    __dirname,
    '..',
    'supabase',
    'migrations',
    '20260823042000_sensitive_permission_delegation_scope_hardening.sql',
  );
  const sql = fs.readFileSync(migrationPath, 'utf8');

  assert.match(sql, /create or replace function public\.guard_sensitive_permission_delegability_scope/i);
  assert.match(sql, /sensitive_text_array_is_subset[\s\S]*delegability_ceiling\s*->\s*'sector_scope'[\s\S]*new\.sector_scope/i);
  assert.match(sql, /sensitive_text_array_is_subset[\s\S]*delegability_ceiling\s*->\s*'entity_scope'[\s\S]*new\.entity_scope/i);
  assert.match(sql, /sensitive_text_array_is_subset[\s\S]*delegability_ceiling\s*->\s*'geo_policy_scope'[\s\S]*new\.geo_policy_scope/i);
  assert.match(sql, /sensitive_resource_scope_is_subset[\s\S]*delegability_ceiling\s*->\s*'resource_scope'[\s\S]*new\.resource_scope/i);
  assert.match(sql, /delegability_ceiling\s*->>\s*'expires_at'[\s\S]*new\.expires_at/i);
  assert.match(sql, /SENSITIVE_PERMISSION_DELEGABILITY_CEILING_EXCEEDS_GRANT_SCOPE/);
  assert.match(sql, /before insert on public\.sensitive_permission_grants/i);
  assert.doesNotMatch(sql, /supabase\s+db\s+push/i);
});
