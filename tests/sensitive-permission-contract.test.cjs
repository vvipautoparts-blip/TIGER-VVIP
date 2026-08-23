'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const contract = require('../scripts/security/sensitive-permission-contract.js');

const NOW = '2026-08-23T00:00:00.000Z';
const LATER = '2026-08-23T12:00:00.000Z';
const TOMORROW = '2026-08-24T00:00:00.000Z';

function grantInput(overrides = {}) {
  return {
    principal: 'partner:alpha',
    action: 'VIEW_FINANCIAL_EARNINGS',
    resource_scope: { kind: 'sector', ids: ['food'] },
    sector_scope: ['food'],
    entity_scope: ['entity:alpha'],
    geo_policy_scope: ['JO'],
    purpose: 'scoped operational visibility',
    reason: 'OWNER_APPROVED_SCOPED_ACCESS',
    grantor: 'owner:root',
    policy_version: '2026-08-22',
    issued_at: NOW,
    not_before: NOW,
    expires_at: TOMORROW,
    delegability_ceiling: {
      actions: ['VIEW_FINANCIAL_EARNINGS'],
      sector_scope: ['food'],
      entity_scope: ['entity:alpha'],
      geo_policy_scope: ['JO'],
      resource_scope: { kind: 'sector', ids: ['food'] },
      expires_at: TOMORROW,
    },
    audit_evidence_ref: 'audit:owner-approval:001',
    status: 'ACTIVE',
    revoked_at: null,
    ...overrides,
  };
}

function delegationGrant(overrides = {}) {
  return contract.createSensitiveGrant(grantInput({
    principal: 'partner:alpha',
    action: 'DELEGATE_PERMISSION',
    purpose: 'delegate a bounded sensitive capability',
    reason: 'OWNER_APPROVED_DELEGATION',
    grantor: 'owner:root',
    delegability_ceiling: {
      actions: ['VIEW_FINANCIAL_EARNINGS'],
      sector_scope: ['food'],
      entity_scope: ['entity:alpha'],
      geo_policy_scope: ['JO'],
      resource_scope: { kind: 'sector', ids: ['food'] },
      expires_at: TOMORROW,
    },
    ...overrides,
  }));
}

test('sensitive capabilities default deny and unknown capabilities fail closed', () => {
  assert.equal(contract.isSensitiveCapabilityGranted([], 'VIEW_FINANCIAL_EARNINGS', LATER), false);
  assert.equal(contract.isSensitiveCapabilityGranted([], 'GRANT_PERMISSION', LATER), false);
  assert.equal(contract.isSensitiveCapabilityGranted([], 'UNKNOWN_CAPABILITY', LATER), false);
  assert.ok(contract.SENSITIVE_CAPABILITIES.includes('VIEW_FINANCIAL_EARNINGS'));
  assert.ok(contract.SENSITIVE_CAPABILITIES.includes('GRANT_PERMISSION'));
  assert.ok(contract.SENSITIVE_CAPABILITIES.includes('DELEGATE_PERMISSION'));
});

test('createSensitiveGrant requires complete bounded audit-bearing input', () => {
  const required = [
    'principal',
    'action',
    'resource_scope',
    'sector_scope',
    'entity_scope',
    'geo_policy_scope',
    'purpose',
    'reason',
    'grantor',
    'policy_version',
    'issued_at',
    'not_before',
    'expires_at',
    'delegability_ceiling',
    'audit_evidence_ref',
  ];

  for (const field of required) {
    const input = grantInput();
    delete input[field];
    assert.throws(
      () => contract.createSensitiveGrant(input),
      { name: 'TypeError' },
      `missing ${field} must fail closed`,
    );
  }

  const grant = contract.createSensitiveGrant(grantInput());
  assert.equal(Object.isFrozen(grant), true);
  assert.equal(Object.isFrozen(grant.resource_scope), true);
  assert.equal(Object.isFrozen(grant.delegability_ceiling), true);
  assert.equal(grant.action, 'VIEW_FINANCIAL_EARNINGS');
});

test('invalid chronology, unbounded scopes, and unsupported actions fail closed', () => {
  assert.throws(
    () => contract.createSensitiveGrant(grantInput({ expires_at: NOW })),
    /expires_at/i,
  );
  assert.throws(
    () => contract.createSensitiveGrant(grantInput({ not_before: TOMORROW, expires_at: LATER })),
    /time|not_before|expires_at/i,
  );
  assert.throws(
    () => contract.createSensitiveGrant(grantInput({ resource_scope: { kind: 'platform', ids: ['*'] } })),
    /scope|wildcard|bounded/i,
  );
  assert.throws(
    () => contract.createSensitiveGrant(grantInput({ action: 'UNKNOWN_CAPABILITY' })),
    /action|capability/i,
  );
});

test('active grants authorize exact sensitive capability only while active', () => {
  const grant = contract.createSensitiveGrant(grantInput());

  assert.equal(contract.isGrantActive(grant, LATER), true);
  assert.equal(contract.isSensitiveCapabilityGranted([grant], 'VIEW_FINANCIAL_EARNINGS', LATER), true);
  assert.equal(contract.isSensitiveCapabilityGranted([grant], 'GRANT_PERMISSION', LATER), false);
  assert.equal(contract.isGrantActive(grant, '2026-08-22T23:59:59.000Z'), false);
  assert.equal(contract.isGrantActive(grant, TOMORROW), false);
});

test('revoked grants authorize nothing', () => {
  const revoked = contract.createSensitiveGrant(grantInput({
    status: 'REVOKED',
    revoked_at: '2026-08-23T06:00:00.000Z',
  }));

  assert.equal(contract.isGrantActive(revoked, LATER), false);
  assert.equal(contract.isSensitiveCapabilityGranted([revoked], 'VIEW_FINANCIAL_EARNINGS', LATER), false);
});

test('delegation requires explicit DELEGATE_PERMISSION', () => {
  const ordinaryGrant = contract.createSensitiveGrant(grantInput());
  const requested = contract.createSensitiveGrant(grantInput({
    principal: 'partner:beta',
    grantor: 'partner:alpha',
  }));

  assert.equal(contract.canDelegate(ordinaryGrant, requested, LATER), false);
});

test('delegation cannot exceed capability family or any scope ceiling', () => {
  const grantor = delegationGrant();

  const outsideCapability = contract.createSensitiveGrant(grantInput({
    principal: 'partner:beta',
    action: 'GRANT_PERMISSION',
    grantor: 'partner:alpha',
  }));
  assert.equal(contract.canDelegate(grantor, outsideCapability, LATER), false);

  assert.throws(
    () => contract.createSensitiveGrant(grantInput({
      principal: 'partner:beta',
      grantor: 'partner:alpha',
      sector_scope: ['automotive'],
    })),
    /delegability|ceiling|scope/i,
  );

  assert.throws(
    () => contract.createSensitiveGrant(grantInput({
      principal: 'partner:beta',
      grantor: 'partner:alpha',
      entity_scope: ['entity:beta'],
    })),
    /delegability|ceiling|scope/i,
  );

  assert.throws(
    () => contract.createSensitiveGrant(grantInput({
      principal: 'partner:beta',
      grantor: 'partner:alpha',
      geo_policy_scope: ['US'],
    })),
    /delegability|ceiling|scope/i,
  );

  assert.throws(
    () => contract.createSensitiveGrant(grantInput({
      principal: 'partner:beta',
      grantor: 'partner:alpha',
      resource_scope: { kind: 'sector', ids: ['automotive'] },
    })),
    /delegability|ceiling|scope/i,
  );
});

test('delegation cannot outlive its ceiling and owner root identity is never delegable', () => {
  const grantor = delegationGrant();

  const tooLong = contract.createSensitiveGrant(grantInput({
    principal: 'partner:beta',
    grantor: 'partner:alpha',
    expires_at: '2026-08-25T00:00:00.000Z',
    delegability_ceiling: {
      actions: [],
      sector_scope: [],
      entity_scope: [],
      geo_policy_scope: [],
      resource_scope: { kind: 'sector', ids: [] },
      expires_at: '2026-08-25T00:00:00.000Z',
    },
  }));
  assert.equal(contract.canDelegate(grantor, tooLong, LATER), false);

  const ownerRoot = contract.createSensitiveGrant(grantInput({
    principal: 'owner:root',
    grantor: 'partner:alpha',
  }));
  assert.equal(contract.canDelegate(grantor, ownerRoot, LATER), false);
});

test('valid delegation remains exact, bounded, active, and immutable', () => {
  const grantor = delegationGrant();
  const requested = contract.createSensitiveGrant(grantInput({
    principal: 'partner:beta',
    grantor: 'partner:alpha',
  }));

  assert.equal(contract.canDelegate(grantor, requested, LATER), true);
  assert.equal(Object.isFrozen(contract.ROLE_BUNDLES), true);
});
