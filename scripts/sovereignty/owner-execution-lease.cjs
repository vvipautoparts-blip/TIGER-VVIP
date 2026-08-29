'use strict';

const SCHEMA_VERSION = 'TIGER_SGF_OWNER_EXECUTION_LEASE_V1';
const MAX_TTL_MS = 5 * 60 * 1000;
const CAPABILITIES = new Set([
  'SOCIAL', 'DISCOVERY', 'MESSAGING', 'ADS_DELIVERY', 'ADS_BILLING', 'PULSE', 'AI_RECOMMENDATION', 'DATA_EXPORT'
]);
const ASSURANCE = new Set(['PHISHING_RESISTANT', 'PHISHING_RESISTANT_HARDWARE_BOUND']);
const DIGEST_PATTERN = /^sha256:[0-9a-f]{64}$/;

function leaseError(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

function digest(value, release = false) {
  const normalized = String(value == null ? '' : value).trim().toLowerCase();
  if (release && (normalized === 'latest' || !DIGEST_PATTERN.test(normalized))) {
    throw leaseError('SGF_OWNER_LEASE_RELEASE_INVALID');
  }
  if (!release && !DIGEST_PATTERN.test(normalized)) throw leaseError('SGF_OWNER_LEASE_DIGEST_INVALID');
  return normalized;
}

function normalizeLease(input) {
  const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  if (source.schemaVersion !== SCHEMA_VERSION) throw leaseError('SGF_OWNER_LEASE_SCHEMA_INVALID');
  if (source.rootId !== 'OWNER_ROOT') throw leaseError('SGF_OWNER_LEASE_ROOT_INVALID');
  if (source.standingPrivilege !== false) throw leaseError('SGF_OWNER_LEASE_STANDING_PRIVILEGE_FORBIDDEN');

  const ownerSubject = String(source.ownerSubject == null ? '' : source.ownerSubject).trim();
  if (!ownerSubject || ownerSubject.length > 128) throw leaseError('SGF_OWNER_LEASE_SUBJECT_INVALID');
  const action = String(source.action == null ? '' : source.action).trim().toUpperCase();
  if (!/^[A-Z][A-Z0-9_]{1,63}$/.test(action)) throw leaseError('SGF_OWNER_LEASE_ACTION_INVALID');

  let marketId = null;
  if (source.marketId != null && String(source.marketId).trim() !== '') {
    marketId = String(source.marketId).trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(marketId)) throw leaseError('SGF_OWNER_LEASE_MARKET_INVALID');
  }
  let capability = null;
  if (source.capability != null && String(source.capability).trim() !== '') {
    capability = String(source.capability).trim().toUpperCase();
    if (!CAPABILITIES.has(capability)) throw leaseError('SGF_OWNER_LEASE_CAPABILITY_INVALID');
  }

  const authenticatorAssurance = String(source.authenticatorAssurance == null ? '' : source.authenticatorAssurance).trim().toUpperCase();
  if (!ASSURANCE.has(authenticatorAssurance)) throw leaseError('SGF_OWNER_LEASE_AUTHENTICATOR_INSUFFICIENT');

  const normalized = {
    schemaVersion: SCHEMA_VERSION,
    rootId: 'OWNER_ROOT',
    ownerSubject,
    standingPrivilege: false,
    action,
    marketId,
    capability,
    releaseDigest: digest(source.releaseDigest, true),
    policyDigest: digest(source.policyDigest),
    payloadDigest: digest(source.payloadDigest),
    authenticatorAssurance
  };

  const nonce = String(source.nonce == null ? '' : source.nonce).trim().toLowerCase();
  if (!/^[0-9a-f]{32,128}$/.test(nonce)) throw leaseError('SGF_OWNER_LEASE_NONCE_INVALID');
  normalized.nonce = nonce;

  const issuedAt = Date.parse(source.issuedAt);
  const expiresAt = Date.parse(source.expiresAt);
  if (!Number.isFinite(issuedAt) || !Number.isFinite(expiresAt) || expiresAt <= issuedAt) {
    throw leaseError('SGF_OWNER_LEASE_VALIDITY_INVALID');
  }
  if (expiresAt - issuedAt > MAX_TTL_MS) throw leaseError('SGF_OWNER_LEASE_TTL_EXCEEDED');
  normalized.issuedAt = new Date(issuedAt).toISOString();
  normalized.expiresAt = new Date(expiresAt).toISOString();

  const signature = source.signature;
  if (!signature || typeof signature !== 'object' ||
      typeof signature.keyId !== 'string' || !signature.keyId.trim() ||
      typeof signature.algorithm !== 'string' || !signature.algorithm.trim() ||
      typeof signature.value !== 'string' || !signature.value.trim()) {
    throw leaseError('SGF_OWNER_LEASE_SIGNATURE_INVALID');
  }
  return { normalized, signature };
}

function contextMatches(lease, context) {
  const c = context && typeof context === 'object' ? context : {};
  const market = c.marketId == null || String(c.marketId).trim() === '' ? null : String(c.marketId).trim().toUpperCase();
  const capability = c.capability == null || String(c.capability).trim() === '' ? null : String(c.capability).trim().toUpperCase();
  return String(c.ownerSubject || '').trim() === lease.ownerSubject &&
    String(c.action || '').trim().toUpperCase() === lease.action &&
    market === lease.marketId &&
    capability === lease.capability &&
    String(c.releaseDigest || '').trim().toLowerCase() === lease.releaseDigest &&
    String(c.policyDigest || '').trim().toLowerCase() === lease.policyDigest &&
    String(c.payloadDigest || '').trim().toLowerCase() === lease.payloadDigest;
}

async function authorizeOwnerExecutionLease(options) {
  const source = options && typeof options === 'object' ? options : {};
  const { normalized, signature } = normalizeLease(source.lease);
  const current = Number((typeof source.now === 'function' ? source.now : Date.now)());
  if (!Number.isFinite(current)) throw leaseError('SGF_OWNER_LEASE_CLOCK_INVALID');
  if (current < Date.parse(normalized.issuedAt)) throw leaseError('SGF_OWNER_LEASE_NOT_YET_VALID');
  if (current >= Date.parse(normalized.expiresAt)) throw leaseError('SGF_OWNER_LEASE_EXPIRED');
  if (!contextMatches(normalized, source.context)) throw leaseError('SGF_OWNER_LEASE_CONTEXT_MISMATCH');

  if (typeof source.verifySignature !== 'function') throw leaseError('SGF_OWNER_LEASE_SIGNATURE_VERIFIER_REQUIRED');
  const verified = await source.verifySignature({
    payload: JSON.stringify(normalized),
    signature: Object.freeze({ ...signature })
  });
  if (verified !== true) throw leaseError('SGF_OWNER_LEASE_SIGNATURE_INVALID');

  if (typeof source.consumeNonce !== 'function') throw leaseError('SGF_OWNER_LEASE_NONCE_CONSUMER_REQUIRED');
  if (await source.consumeNonce(normalized.nonce) !== true) throw leaseError('SGF_OWNER_LEASE_REPLAY_DENIED');

  return Object.freeze({
    rootId: 'OWNER_ROOT',
    ownerSubject: normalized.ownerSubject,
    action: normalized.action,
    authorized: true
  });
}

module.exports = Object.freeze({ SCHEMA_VERSION, MAX_TTL_MS, authorizeOwnerExecutionLease });
