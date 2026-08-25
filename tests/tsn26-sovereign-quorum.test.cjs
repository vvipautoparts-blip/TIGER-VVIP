'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  ROOT_ACTIONS,
  rootActionDigest,
  authorizeRootAction,
} = require('../src/tsn26/sovereign-quorum.cjs');

function action(overrides = {}) {
  return {
    actionId: 'root-action-001',
    type: ROOT_ACTIONS.ACTIVATE_FINANCIAL_CONSTITUTION,
    target: 'TFC-2026.08.001',
    requestedAt: '2026-08-26T01:00:00.000Z',
    expiresAt: '2026-08-26T01:10:00.000Z',
    ...overrides,
  };
}

function approval(actionValue, overrides = {}) {
  return {
    actorUid: 'owner-001',
    authority: 'OWNER',
    proofId: 'passkey-proof-owner',
    proofVerified: true,
    actionDigest: rootActionDigest(actionValue),
    approvedAt: '2026-08-26T01:01:00.000Z',
    ...overrides,
  };
}

test('single owner session can never authorize a root financial action', () => {
  const value = action();
  assert.throws(
    () => authorizeRootAction(value, [approval(value)], { now: '2026-08-26T01:02:00.000Z' }),
    /TSN26_QUORUM_NOT_REACHED/,
  );
});

test('owner plus independent security cosigner reaches sovereign quorum', () => {
  const value = action();
  const approvals = [
    approval(value),
    approval(value, {
      actorUid: 'security-001',
      authority: 'SECURITY_COSIGNER',
      proofId: 'hsm-proof-security',
    }),
  ];
  const result = authorizeRootAction(value, approvals, { now: '2026-08-26T01:02:00.000Z' });
  assert.equal(result.authorized, true);
  assert.equal(result.uniqueApprovers, 2);
  assert.equal(result.actionDigest, rootActionDigest(value));
});

test('duplicate approvals by the same actor do not satisfy quorum', () => {
  const value = action();
  assert.throws(
    () => authorizeRootAction(value, [
      approval(value),
      approval(value, { proofId: 'second-proof-same-owner' }),
    ], { now: '2026-08-26T01:02:00.000Z' }),
    /TSN26_DUPLICATE_QUORUM_ACTOR/,
  );
});

test('unverified, mismatched, expired, or AI approvals fail closed', () => {
  const value = action();
  assert.throws(() => authorizeRootAction(value, [
    approval(value),
    approval(value, { actorUid: 'security-001', authority: 'SECURITY_COSIGNER', proofVerified: false }),
  ], { now: '2026-08-26T01:02:00.000Z' }), /TSN26_UNVERIFIED_QUORUM_PROOF/);

  assert.throws(() => authorizeRootAction(value, [
    approval(value),
    approval(value, { actorUid: 'security-001', authority: 'SECURITY_COSIGNER', actionDigest: 'bad' }),
  ], { now: '2026-08-26T01:02:00.000Z' }), /TSN26_QUORUM_DIGEST_MISMATCH/);

  assert.throws(() => authorizeRootAction(value, [
    approval(value),
    approval(value, { actorUid: 'agent-001', authority: 'AI_AGENT' }),
  ], { now: '2026-08-26T01:02:00.000Z' }), /TSN26_FORBIDDEN_QUORUM_AUTHORITY/);

  assert.throws(() => authorizeRootAction(value, [
    approval(value),
    approval(value, { actorUid: 'security-001', authority: 'SECURITY_COSIGNER' }),
  ], { now: '2026-08-26T01:10:00.001Z' }), /TSN26_ROOT_ACTION_EXPIRED/);
});
