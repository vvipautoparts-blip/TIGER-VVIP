'use strict';

const AUTHORITY_STATES = Object.freeze(['PENDING', 'VERIFIED', 'ACTIVE', 'SUSPENDED', 'REVOKED']);
const ASSURANCE_LEVELS = Object.freeze(['L1', 'L2', 'L3', 'L4']);
const MAX_L4_LEASE_SECONDS = 120;
const TOTAL_CREDENTIAL_LOSS_L4_HOLD_SECONDS = 24 * 60 * 60;

const FRESHNESS_SECONDS = Object.freeze({
  L2_MFA: 30 * 60,
  L3_REVERIFICATION: 5 * 60,
  L4_REVERIFICATION: MAX_L4_LEASE_SECONDS,
});

const allow = (code = 'OWNER_ACCESS_ALLOWED') => Object.freeze({ allowed: true, code });
const deny = (code) => Object.freeze({ allowed: false, code });
const activation = (ok, code) => Object.freeze({ ok, code });

function isPlainRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function parsedMillis(value) {
  if (typeof value !== 'string') return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

function isFresh(timestamp, maxAgeSeconds, nowMs) {
  const proofMs = parsedMillis(timestamp);
  if (proofMs === null || proofMs > nowMs) return false;
  return nowMs - proofMs <= maxAgeSeconds * 1000;
}

function canActivateOwnerAuthority(input) {
  if (!isPlainRecord(input) || input.authorityStatus !== 'VERIFIED' || !isPlainRecord(input.factors)) {
    return activation(false, 'ERR_OWNER_ACTIVATION_PREREQUISITES');
  }
  for (const factor of ['passkey', 'totp', 'backupCodes']) {
    if (input.factors[factor] !== true) return activation(false, 'ERR_OWNER_STRONG_FACTOR_ENROLLMENT_REQUIRED');
  }
  return activation(true, 'OWNER_ACTIVATION_READY');
}

function evaluateOwnerAccess(input, { now = () => new Date().toISOString() } = {}) {
  if (!isPlainRecord(input) || !Object.prototype.hasOwnProperty.call(input, 'authority') || !ASSURANCE_LEVELS.includes(input.requiredLevel)) {
    return deny('ERR_OWNER_CONTEXT_INVALID');
  }

  if (input.authority === null) return deny('ERR_OWNER_AUTHORITY_MISSING');
  if (!isPlainRecord(input.authority) || !AUTHORITY_STATES.includes(input.authority.status)) return deny('ERR_OWNER_CONTEXT_INVALID');
  if (input.authority.status !== 'ACTIVE') return deny('ERR_OWNER_AUTHORITY_INACTIVE');
  if (!isPlainRecord(input.security) || !isPlainRecord(input.auth)) return deny('ERR_OWNER_CONTEXT_INVALID');
  if (typeof input.authority.clerkUserId !== 'string' || typeof input.auth.clerkUserId !== 'string') return deny('ERR_OWNER_CONTEXT_INVALID');
  if (input.authority.clerkUserId !== input.auth.clerkUserId) return deny('ERR_OWNER_IDENTITY_BINDING_MISMATCH');
  if (input.auth.sessionAuthenticated !== true) return deny('ERR_OWNER_SESSION_REQUIRED');

  if (input.security.killSwitch !== false) return deny('ERR_OWNER_KILL_SWITCH');
  if (input.security.recoveryState !== 'NONE' && input.security.recoveryState !== 'COMPLETED') return deny('ERR_OWNER_RECOVERY_PENDING');
  if (input.security.holdState !== 'CLEAR') return deny('ERR_OWNER_SECURITY_HOLD');

  let nowMs;
  try { nowMs = Date.parse(now()); } catch { return deny('ERR_OWNER_CLOCK_INVALID'); }
  if (!Number.isFinite(nowMs)) return deny('ERR_OWNER_CLOCK_INVALID');

  if (input.security.holdUntil) {
    const holdUntilMs = parsedMillis(input.security.holdUntil);
    if (holdUntilMs === null) return deny('ERR_OWNER_CONTEXT_INVALID');
    if (holdUntilMs > nowMs) return deny('ERR_OWNER_SECURITY_HOLD');
  }

  const level = input.requiredLevel;
  if (level === 'L1') return allow();

  if (!isFresh(input.auth.mfaVerifiedAt, FRESHNESS_SECONDS.L2_MFA, nowMs)) {
    return deny('ERR_OWNER_MFA_REQUIRED');
  }
  if (level === 'L2') return allow();

  const reverifyWindow = level === 'L4' ? FRESHNESS_SECONDS.L4_REVERIFICATION : FRESHNESS_SECONDS.L3_REVERIFICATION;
  if (!isFresh(input.auth.reverifiedAt, reverifyWindow, nowMs)) {
    return deny('ERR_OWNER_REVERIFICATION_REQUIRED');
  }

  if (level === 'L4' && input.security.l4Enabled !== true) return deny('ERR_OWNER_L4_DISABLED');
  return allow();
}

module.exports = Object.freeze({
  AUTHORITY_STATES,
  ASSURANCE_LEVELS,
  MAX_L4_LEASE_SECONDS,
  TOTAL_CREDENTIAL_LOSS_L4_HOLD_SECONDS,
  FRESHNESS_SECONDS,
  canActivateOwnerAuthority,
  evaluateOwnerAccess,
});
