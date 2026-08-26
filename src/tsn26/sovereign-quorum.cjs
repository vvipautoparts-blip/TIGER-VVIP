'use strict';

const crypto = require('node:crypto');

const ROOT_ACTIONS = Object.freeze({
  ACTIVATE_FINANCIAL_CONSTITUTION: 'ACTIVATE_FINANCIAL_CONSTITUTION',
  CHANGE_ROOT_SECURITY_POLICY: 'CHANGE_ROOT_SECURITY_POLICY',
  ROTATE_FINANCIAL_ROOT_KEY: 'ROTATE_FINANCIAL_ROOT_KEY',
  OVERRIDE_PAYOUT_GUARD: 'OVERRIDE_PAYOUT_GUARD',
});

const ALLOWED_AUTHORITIES = new Set(['OWNER', 'SECURITY_COSIGNER']);
const REQUIRED_AUTHORITIES = Object.freeze({
  [ROOT_ACTIONS.ACTIVATE_FINANCIAL_CONSTITUTION]: Object.freeze(['OWNER', 'SECURITY_COSIGNER']),
  [ROOT_ACTIONS.CHANGE_ROOT_SECURITY_POLICY]: Object.freeze(['OWNER', 'SECURITY_COSIGNER']),
  [ROOT_ACTIONS.ROTATE_FINANCIAL_ROOT_KEY]: Object.freeze(['OWNER', 'SECURITY_COSIGNER']),
  [ROOT_ACTIONS.OVERRIDE_PAYOUT_GUARD]: Object.freeze(['OWNER', 'SECURITY_COSIGNER']),
});

function nonEmpty(value, code) {
  if (typeof value !== 'string' || value.trim() === '') throw new Error(code);
  return value.trim();
}

function instant(value, code) {
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) throw new Error(code);
  return { ms, iso: new Date(ms).toISOString() };
}

function normalizeAction(input) {
  if (!input || typeof input !== 'object') throw new Error('TSN26_ROOT_ACTION_REQUIRED');
  const type = nonEmpty(input.type, 'TSN26_ROOT_ACTION_TYPE_REQUIRED');
  if (!Object.values(ROOT_ACTIONS).includes(type)) throw new Error(`TSN26_UNSUPPORTED_ROOT_ACTION:${type}`);
  const requestedAt = instant(input.requestedAt, 'TSN26_INVALID_ROOT_ACTION_REQUESTED_AT');
  const expiresAt = instant(input.expiresAt, 'TSN26_INVALID_ROOT_ACTION_EXPIRES_AT');
  if (expiresAt.ms <= requestedAt.ms) throw new Error('TSN26_ROOT_ACTION_EXPIRY_INVALID');
  return Object.freeze({
    actionId: nonEmpty(input.actionId, 'TSN26_ROOT_ACTION_ID_REQUIRED'),
    type,
    target: nonEmpty(input.target, 'TSN26_ROOT_ACTION_TARGET_REQUIRED'),
    requestedAt: requestedAt.iso,
    expiresAt: expiresAt.iso,
  });
}

function rootActionDigest(actionInput) {
  const action = normalizeAction(actionInput);
  const canonical = JSON.stringify({
    actionId: action.actionId,
    type: action.type,
    target: action.target,
    requestedAt: action.requestedAt,
    expiresAt: action.expiresAt,
  });
  return crypto.createHash('sha256').update(canonical, 'utf8').digest('hex');
}

function authorizeRootAction(actionInput, approvals, { now } = {}) {
  const action = normalizeAction(actionInput);
  const nowInstant = instant(now, 'TSN26_INVALID_QUORUM_NOW');
  if (nowInstant.ms > Date.parse(action.expiresAt)) throw new Error('TSN26_ROOT_ACTION_EXPIRED');
  if (nowInstant.ms < Date.parse(action.requestedAt)) throw new Error('TSN26_ROOT_ACTION_NOT_YET_VALID');
  if (!Array.isArray(approvals)) throw new Error('TSN26_QUORUM_APPROVALS_REQUIRED');

  const expectedDigest = rootActionDigest(action);
  const actorIds = new Set();
  const authorities = new Set();

  for (const approval of approvals) {
    if (!approval || typeof approval !== 'object') throw new Error('TSN26_INVALID_QUORUM_APPROVAL');
    const actorUid = nonEmpty(approval.actorUid, 'TSN26_QUORUM_ACTOR_REQUIRED');
    if (actorIds.has(actorUid)) throw new Error(`TSN26_DUPLICATE_QUORUM_ACTOR:${actorUid}`);
    actorIds.add(actorUid);

    const authority = nonEmpty(approval.authority, 'TSN26_QUORUM_AUTHORITY_REQUIRED');
    if (!ALLOWED_AUTHORITIES.has(authority)) throw new Error(`TSN26_FORBIDDEN_QUORUM_AUTHORITY:${authority}`);
    if (approval.proofVerified !== true) throw new Error(`TSN26_UNVERIFIED_QUORUM_PROOF:${actorUid}`);
    nonEmpty(approval.proofId, 'TSN26_QUORUM_PROOF_ID_REQUIRED');
    if (approval.actionDigest !== expectedDigest) throw new Error(`TSN26_QUORUM_DIGEST_MISMATCH:${actorUid}`);

    const approvedAt = instant(approval.approvedAt, 'TSN26_INVALID_QUORUM_APPROVED_AT');
    if (approvedAt.ms < Date.parse(action.requestedAt) || approvedAt.ms > Date.parse(action.expiresAt)) {
      throw new Error(`TSN26_QUORUM_APPROVAL_OUTSIDE_WINDOW:${actorUid}`);
    }
    authorities.add(authority);
  }

  const required = REQUIRED_AUTHORITIES[action.type];
  if (actorIds.size < required.length || !required.every((authority) => authorities.has(authority))) {
    throw new Error(`TSN26_QUORUM_NOT_REACHED:${action.type}`);
  }

  return Object.freeze({
    authorized: true,
    actionId: action.actionId,
    actionType: action.type,
    actionDigest: expectedDigest,
    uniqueApprovers: actorIds.size,
    authorities: Object.freeze([...authorities].sort()),
    authorizedAt: nowInstant.iso,
  });
}

module.exports = {
  ROOT_ACTIONS,
  REQUIRED_AUTHORITIES,
  rootActionDigest,
  authorizeRootAction,
};
