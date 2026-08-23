'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const policy = require('../scripts/security/sovereign-proof-policy.js');

function signal(type, overrides = {}) {
  return {
    type,
    source: 'security-engine',
    evidence_ref: 'risk:evidence:001',
    ...overrides,
  };
}

test('baseline risk is server-owned and privileged actions have explicit non-client tiers', () => {
  assert.equal(policy.resolveBaselineRisk('GRANT_PERMISSION'), 'HIGH');
  assert.equal(policy.resolveBaselineRisk('REVOKE_PERMISSION'), 'HIGH');
  assert.equal(policy.resolveBaselineRisk('DELEGATE_PERMISSION'), 'CRITICAL');
  assert.equal(policy.resolveBaselineRisk('SECURITY_POLICY_MUTATION'), 'CRITICAL');
  assert.equal(policy.resolveBaselineRisk('DISCOVERY_QUERY'), 'LOW');
  assert.throws(() => policy.resolveBaselineRisk('UNKNOWN_NEW_ACTION'), /unclassified|deny|risk/i);
});

test('client risk labels are forbidden and never influence authoritative tier', () => {
  assert.throws(
    () => policy.applyRiskRatchet({
      action: 'GRANT_PERMISSION',
      client_risk_tier: 'LOW',
      risk_signals: [],
    }),
    /client|risk|forbidden/i,
  );

  const result = policy.applyRiskRatchet({
    action: 'GRANT_PERMISSION',
    risk_signals: [],
  });
  assert.equal(result.baseline_tier, 'HIGH');
  assert.equal(result.effective_tier, 'HIGH');
  assert.equal(result.denied, false);
});

test('risk ratchet is monotonic: signals retain or raise baseline but never lower it', () => {
  const retained = policy.applyRiskRatchet({
    action: 'GRANT_PERMISSION',
    risk_signals: [signal('SESSION_ACTIVE')],
  });
  assert.equal(retained.effective_tier, 'HIGH');

  const raised = policy.applyRiskRatchet({
    action: 'GRANT_PERMISSION',
    risk_signals: [signal('RISK_CRITICAL')],
  });
  assert.equal(raised.effective_tier, 'CRITICAL');

  const lowActionRaised = policy.applyRiskRatchet({
    action: 'DISCOVERY_QUERY',
    risk_signals: [signal('RISK_ELEVATED')],
  });
  assert.equal(lowActionRaised.effective_tier, 'MEDIUM');

  assert.throws(
    () => policy.applyRiskRatchet({
      action: 'GRANT_PERMISSION',
      risk_signals: [signal('RISK_LOWER', { requested_tier: 'LOW' })],
    }),
    /lower|unsupported|forbidden|signal/i,
  );
});

test('revocation and disable signals deny privileged execution instead of merely increasing tier', () => {
  for (const type of ['SESSION_REVOKED', 'ACCOUNT_DISABLED']) {
    const result = policy.applyRiskRatchet({
      action: 'GRANT_PERMISSION',
      risk_signals: [signal(type)],
    });
    assert.equal(result.denied, true);
    assert.ok(result.reason_codes.includes(type));
  }
});

test('risk/AI signals cannot carry capability grants, scope expansion or authority decisions', () => {
  for (const injected of [
    { capabilities: ['GRANT_PERMISSION'] },
    { grants: [{ action: 'GRANT_PERMISSION' }] },
    { scope: { sector_scope: ['*'] } },
    { expanded_scope: ['platform'] },
    { authorization: 'ALLOW' },
    { execution_authority: true },
  ]) {
    assert.throws(
      () => policy.applyRiskRatchet({
        action: 'GRANT_PERMISSION',
        risk_signals: [signal('RISK_ELEVATED', injected)],
      }),
      /authority|capabil|grant|scope|forbidden/i,
    );
  }
});

test('required proof classes derive only from effective server risk and are deterministic', () => {
  const medium = policy.resolveRequiredProofClasses({
    action: 'DISCOVERY_QUERY',
    risk_signals: [signal('RISK_ELEVATED')],
  });
  assert.deepEqual(medium, ['EXECUTION_LEASE', 'PERSISTENT_GRANT', 'PRIVILEGED_BFF']);

  const high = policy.resolveRequiredProofClasses({
    action: 'GRANT_PERMISSION',
    risk_signals: [],
  });
  assert.deepEqual(high, [
    'EXECUTION_LEASE',
    'FRESH_REVERIFICATION',
    'PERSISTENT_GRANT',
    'PRIVILEGED_BFF',
    'SECURITY_ISLAND',
  ]);

  const critical = policy.resolveRequiredProofClasses({
    action: 'DELEGATE_PERMISSION',
    risk_signals: [],
  });
  assert.deepEqual(critical, [
    'EXECUTION_LEASE',
    'FRESH_REVERIFICATION',
    'OWNER_OR_POLICY_APPROVAL',
    'PERSISTENT_GRANT',
    'PRIVILEGED_BFF',
    'RELEASE_PROOF',
    'SECURITY_ISLAND',
    'SESSION_REVOCATION_PROOF',
  ]);
});

test('denied risk decision cannot be converted into a proof-class allow decision', () => {
  assert.throws(
    () => policy.resolveRequiredProofClasses({
      action: 'GRANT_PERMISSION',
      risk_signals: [signal('SESSION_REVOKED')],
    }),
    /denied|revoked|risk/i,
  );
});
