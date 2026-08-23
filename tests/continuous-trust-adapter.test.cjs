'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const trust = require('../scripts/security/continuous-trust-adapter.js');

function descriptor(overrides = {}) {
  return {
    source: 'clerk',
    evidence_ref: 'security-event:evt_001',
    ...overrides,
  };
}

function verified(type = 'SESSION_ACTIVE', overrides = {}) {
  return {
    ok: true,
    type,
    source: 'clerk',
    evidence_ref: 'security-event:evt_001',
    ...overrides,
  };
}

function adapter(overrides = {}) {
  return trust.createContinuousTrustAdapter({
    verifyEventEvidence: async () => verified(),
    ...overrides,
  });
}

test('continuous trust requires an evidence verification port', () => {
  assert.throws(() => trust.createContinuousTrustAdapter({}), /verify|evidence|port/i);
});

test('verified session revocation and account disable force deny', async () => {
  for (const type of ['SESSION_REVOKED', 'ACCOUNT_DISABLED']) {
    const instance = adapter({ verifyEventEvidence: async () => verified(type) });
    const result = await instance.evaluate({
      action: 'GRANT_PERMISSION',
      event_evidence: [descriptor()],
    });

    assert.equal(result.ok, false);
    assert.equal(result.denied, true);
    assert.equal(result.execution_authority, false);
    assert.deepEqual(result.normalized_events, [{
      type,
      source: 'clerk',
      evidence_ref: 'security-event:evt_001',
    }]);
  }
});

test('risk and credential/device events can only retain or raise server baseline risk', async () => {
  const cases = [
    ['RISK_ELEVATED', 'HIGH'],
    ['CREDENTIAL_CHANGED', 'CRITICAL'],
    ['DEVICE_BINDING_LOST', 'CRITICAL'],
  ];

  for (const [type, expectedTier] of cases) {
    const instance = adapter({ verifyEventEvidence: async () => verified(type) });
    const result = await instance.evaluate({
      action: 'SOCIAL_REACTION',
      event_evidence: [descriptor()],
    });

    assert.equal(result.baseline_tier, 'LOW');
    assert.equal(result.effective_tier, expectedTier);
    assert.equal(result.execution_authority, false);
  }
});

test('active session cannot lower an already-high baseline', async () => {
  const result = await adapter().evaluate({
    action: 'GRANT_PERMISSION',
    event_evidence: [descriptor()],
  });

  assert.equal(result.baseline_tier, 'HIGH');
  assert.equal(result.effective_tier, 'HIGH');
  assert.equal(result.denied, false);
  assert.equal(result.execution_authority, false);
});

test('missing, unavailable, failed or unknown optional signal source normalizes to UNKNOWN, never positive trust', async () => {
  const noSource = await adapter().evaluate({
    action: 'GRANT_PERMISSION',
    event_evidence: [],
  });
  assert.deepEqual(noSource.normalized_events, [{
    type: 'UNKNOWN',
    source: 'continuous-trust',
    evidence_ref: 'signal-source:none',
  }]);

  for (const verifyEventEvidence of [
    async () => ({ ok: false, reason_code: 'SOURCE_UNAVAILABLE' }),
    async () => { throw new Error('provider internal detail'); },
    async () => verified('SOME_FUTURE_EVENT'),
  ]) {
    const result = await adapter({ verifyEventEvidence }).evaluate({
      action: 'GRANT_PERMISSION',
      event_evidence: [descriptor()],
    });
    assert.equal(result.normalized_events[0].type, 'UNKNOWN');
    assert.equal(result.execution_authority, false);
  }
});

test('event verifier must bind exact source and evidence reference', async () => {
  for (const mismatch of [
    { source: 'other-provider' },
    { evidence_ref: 'security-event:other' },
  ]) {
    const result = await adapter({
      verifyEventEvidence: async () => verified('SESSION_ACTIVE', mismatch),
    }).evaluate({ action: 'GRANT_PERMISSION', event_evidence: [descriptor()] });

    assert.equal(result.normalized_events[0].type, 'UNKNOWN');
    assert.equal(result.execution_authority, false);
  }
});

test('authority-shaped or raw behavioral/credential input is rejected before verification', async () => {
  let calls = 0;
  const instance = adapter({
    verifyEventEvidence: async () => { calls += 1; return verified(); },
  });

  for (const injected of [
    { capabilities: ['GRANT_PERMISSION'] },
    { grants: ['grant:1'] },
    { scope: { resource: '*' } },
    { authorization: 'Bearer secret' },
    { session_token: 'secret' },
    { behavior_profile: { score: 1 } },
    { requested_tier: 'LOW' },
  ]) {
    await assert.rejects(
      instance.evaluate({ action: 'GRANT_PERMISSION', event_evidence: [descriptor(injected)] }),
      /forbidden|authority|credential|field|behavior|risk/i,
    );
  }
  assert.equal(calls, 0);
});

test('adapter sends verifier only bounded source/evidence reference and returns no raw provider payload', async () => {
  let seen;
  const result = await adapter({
    verifyEventEvidence: async (input) => {
      seen = input;
      return verified('RISK_ELEVATED', { raw_provider_payload: 'must-not-leak' });
    },
  }).evaluate({ action: 'GRANT_PERMISSION', event_evidence: [descriptor()] });

  assert.deepEqual(seen, {
    source: 'clerk',
    evidence_ref: 'security-event:evt_001',
  });
  assert.equal(JSON.stringify(result).includes('must-not-leak'), false);
  assert.equal(result.execution_authority, false);
});
