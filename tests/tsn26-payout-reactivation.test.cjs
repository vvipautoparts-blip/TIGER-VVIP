'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  STATES,
  createPayoutProfile,
  applyDeadline,
  reactivateSuspendedPayoutProfile,
} = require('../src/tsn26/payout-state-machine.cjs');

function suspendedProfile() {
  const profile = createPayoutProfile({
    subjectUid: 'user-001',
    role: 'MARKETER',
    grantedAt: '2026-08-26T00:00:00.000Z',
  });
  return applyDeadline(profile, { at: '2026-08-26T12:00:00.001Z' });
}

test('only an explicit audited reactivation can reopen a suspended payout profile', () => {
  const reactivated = reactivateSuspendedPayoutProfile(suspendedProfile(), {
    newDeadlineAt: '2026-08-27T00:00:00.000Z',
    grantedBy: 'owner-001',
    grantedAt: '2026-08-26T12:05:00.000Z',
    reason: 'Beneficiary requested a documented second verification window.',
  });
  assert.equal(reactivated.state, STATES.PAYOUT_PROFILE_PENDING);
  assert.equal(reactivated.deadlineAt, '2026-08-27T00:00:00.000Z');
  assert.equal(reactivated.history.at(-1).event, 'PAYOUT_PROFILE_REACTIVATED');
  assert.equal(reactivated.history.at(-1).actorUid, 'owner-001');
});

test('reactivation is allowed only from suspended state', () => {
  const activeWindow = createPayoutProfile({
    subjectUid: 'user-001',
    role: 'MARKETER',
    grantedAt: '2026-08-26T00:00:00.000Z',
  });
  assert.throws(
    () => reactivateSuspendedPayoutProfile(activeWindow, {
      newDeadlineAt: '2026-08-27T00:00:00.000Z',
      grantedBy: 'owner-001',
      grantedAt: '2026-08-26T01:00:00.000Z',
      reason: 'not suspended',
    }),
    /TSN26_REACTIVATION_REQUIRES_SUSPENDED_STATE/,
  );
});

test('reactivation requires actor, reason, and a future deadline', () => {
  const profile = suspendedProfile();
  assert.throws(
    () => reactivateSuspendedPayoutProfile(profile, {
      newDeadlineAt: '2026-08-26T12:04:00.000Z',
      grantedBy: 'owner-001',
      grantedAt: '2026-08-26T12:05:00.000Z',
      reason: 'invalid deadline',
    }),
    /TSN26_REACTIVATION_DEADLINE_MUST_BE_FUTURE/,
  );
  assert.throws(
    () => reactivateSuspendedPayoutProfile(profile, {
      newDeadlineAt: '2026-08-27T00:00:00.000Z',
      grantedBy: '',
      grantedAt: '2026-08-26T12:05:00.000Z',
      reason: 'missing actor',
    }),
    /TSN26_REACTIVATION_ACTOR_REQUIRED/,
  );
});
