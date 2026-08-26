'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  STATES,
  createPayoutProfile,
  transitionPayoutProfile,
  applyDeadline,
  extendPayoutDeadline,
  assertExternalPayoutEligible,
} = require('../src/tsn26/payout-state-machine.cjs');

const GRANTED_AT = '2026-08-26T00:00:00.000Z';

function newProfile(overrides = {}) {
  return createPayoutProfile({
    subjectUid: 'user-001',
    role: 'MARKETER',
    grantedAt: GRANTED_AT,
    ...overrides,
  });
}

test('new role starts payout-profile pending with a strict 12-hour deadline', () => {
  const profile = newProfile();
  assert.equal(profile.state, STATES.PAYOUT_PROFILE_PENDING);
  assert.equal(profile.deadlineAt, '2026-08-26T12:00:00.000Z');
  assert.equal(profile.payoutDestinationVerified, false);
  assert.equal(profile.identityValidated, false);
});

test('verified identity and payout destination activate financial eligibility', () => {
  let profile = newProfile();
  profile = transitionPayoutProfile(profile, {
    event: 'IDENTITY_VALIDATED',
    at: '2026-08-26T01:00:00.000Z',
    actorUid: 'system-identity',
  });
  profile = transitionPayoutProfile(profile, {
    event: 'PAYOUT_DESTINATION_VERIFIED',
    at: '2026-08-26T01:05:00.000Z',
    actorUid: 'system-payout-verifier',
    destinationRef: 'payout-destination-token-001',
  });

  assert.equal(profile.state, STATES.FINANCIALLY_ACTIVE);
  assert.equal(profile.identityValidated, true);
  assert.equal(profile.payoutDestinationVerified, true);
  assert.equal(assertExternalPayoutEligible(profile, { at: '2026-08-26T02:00:00.000Z' }), true);
});

test('deadline suspends financial privilege when required verification is incomplete', () => {
  const suspended = applyDeadline(newProfile(), { at: '2026-08-26T12:00:00.001Z' });
  assert.equal(suspended.state, STATES.FINANCIAL_PRIVILEGE_SUSPENDED);
  assert.throws(
    () => assertExternalPayoutEligible(suspended, { at: '2026-08-26T12:01:00.000Z' }),
    /TSN26_PAYOUT_NOT_ELIGIBLE/,
  );
});

test('owner extension is explicit, bounded and auditable', () => {
  const extended = extendPayoutDeadline(newProfile(), {
    extensionUntil: '2026-08-27T00:00:00.000Z',
    grantedBy: 'owner-001',
    grantedAt: '2026-08-26T11:59:00.000Z',
    reason: 'Verified beneficiary documentation is pending.',
  });
  assert.equal(extended.deadlineAt, '2026-08-27T00:00:00.000Z');
  assert.equal(extended.extensions.length, 1);
  assert.equal(extended.extensions[0].grantedBy, 'owner-001');
  assert.equal(extended.extensions[0].reason, 'Verified beneficiary documentation is pending.');
});

test('silent or retroactive extensions fail closed', () => {
  assert.throws(
    () => extendPayoutDeadline(newProfile(), {
      extensionUntil: '2026-08-27T00:00:00.000Z',
      grantedBy: '',
      grantedAt: '2026-08-26T11:59:00.000Z',
      reason: 'x',
    }),
    /TSN26_EXTENSION_ACTOR_REQUIRED/,
  );
  assert.throws(
    () => extendPayoutDeadline(newProfile(), {
      extensionUntil: '2026-08-26T10:00:00.000Z',
      grantedBy: 'owner-001',
      grantedAt: '2026-08-26T12:01:00.000Z',
      reason: 'late extension',
    }),
    /TSN26_EXTENSION_MUST_BE_FUTURE/,
  );
});

test('revoke is terminal for payout eligibility and history remains append-only', () => {
  const revoked = transitionPayoutProfile(newProfile(), {
    event: 'REVOKED',
    at: '2026-08-26T03:00:00.000Z',
    actorUid: 'owner-001',
    reason: 'role removed',
  });
  assert.equal(revoked.state, STATES.REVOKED);
  assert.equal(revoked.history.at(-1).event, 'REVOKED');
  assert.throws(
    () => transitionPayoutProfile(revoked, {
      event: 'IDENTITY_VALIDATED',
      at: '2026-08-26T04:00:00.000Z',
      actorUid: 'system-identity',
    }),
    /TSN26_TERMINAL_PAYOUT_STATE/,
  );
});
