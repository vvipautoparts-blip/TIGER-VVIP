'use strict';

const crypto = require('node:crypto');

const SELLER_ROLES = new Set(['GENERAL_MANAGER', 'SECTOR_MANAGER', 'MARKETER']);
const CLAIM_FIELDS = Object.freeze([
  'claimId',
  'sellerUid',
  'sellerRole',
  'buyerUid',
  'offerId',
  'sectorId',
  'countryId',
  'issuedAt',
  'expiresAt',
  'nonce',
]);

function requireNonEmptyString(value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`TSN26_INVALID_CLAIM_FIELD:${field}`);
  }
  return value;
}

function requireIsoInstant(value, field) {
  requireNonEmptyString(value, field);
  const time = Date.parse(value);
  if (!Number.isFinite(time)) {
    throw new TypeError(`TSN26_INVALID_CLAIM_TIME:${field}`);
  }
  return time;
}

function createUnsignedClaim(input) {
  if (!input || typeof input !== 'object') {
    throw new TypeError('TSN26_INVALID_CLAIM_INPUT');
  }

  const sellerRole = requireNonEmptyString(input.sellerRole, 'sellerRole');
  if (!SELLER_ROLES.has(sellerRole)) {
    throw new Error(`TSN26_INVALID_SELLER_ROLE:${sellerRole}`);
  }

  const issuedAtMs = requireIsoInstant(input.issuedAt, 'issuedAt');
  const expiresAtMs = requireIsoInstant(input.expiresAt, 'expiresAt');
  if (expiresAtMs <= issuedAtMs) {
    throw new Error('TSN26_CLAIM_EXPIRY_NOT_AFTER_ISSUE');
  }

  const claim = {
    claimId: requireNonEmptyString(input.claimId, 'claimId'),
    sellerUid: requireNonEmptyString(input.sellerUid, 'sellerUid'),
    sellerRole,
    buyerUid: requireNonEmptyString(input.buyerUid, 'buyerUid'),
    offerId: requireNonEmptyString(input.offerId, 'offerId'),
    sectorId: requireNonEmptyString(input.sectorId, 'sectorId'),
    countryId: requireNonEmptyString(input.countryId, 'countryId').toUpperCase(),
    issuedAt: new Date(issuedAtMs).toISOString(),
    expiresAt: new Date(expiresAtMs).toISOString(),
    nonce: requireNonEmptyString(input.nonce, 'nonce'),
    status: 'UNSIGNED',
  };

  return Object.freeze(claim);
}

function canonicalPayload(claim) {
  const payload = {};
  for (const field of CLAIM_FIELDS) {
    payload[field] = claim[field];
  }
  return JSON.stringify(payload);
}

function payloadHash(claim) {
  return crypto.createHash('sha256').update(canonicalPayload(claim), 'utf8').digest('hex');
}

// Production deployments should source signing operations from an HSM/KMS-backed key provider.
// This primitive deliberately keeps signing deterministic in scope and never persists private keys.
function signAndLockClaim(unsignedClaim, { privateKey, keyId }) {
  if (!unsignedClaim || unsignedClaim.status !== 'UNSIGNED') {
    throw new Error('TSN26_CLAIM_NOT_UNSIGNED');
  }
  requireNonEmptyString(keyId, 'keyId');
  if (!privateKey) {
    throw new Error('TSN26_CLAIM_PRIVATE_KEY_REQUIRED');
  }

  const data = Buffer.from(canonicalPayload(unsignedClaim), 'utf8');
  const signature = crypto.sign(null, data, privateKey).toString('base64url');

  return Object.freeze({
    ...Object.fromEntries(CLAIM_FIELDS.map((field) => [field, unsignedClaim[field]])),
    payloadHash: payloadHash(unsignedClaim),
    signature,
    keyId,
    status: 'LOCKED',
  });
}

function verifyLockedClaim(claim, { publicKey, now }) {
  if (!claim || claim.status !== 'LOCKED') {
    throw new Error('TSN26_CLAIM_NOT_LOCKED');
  }
  if (!publicKey) {
    throw new Error('TSN26_CLAIM_PUBLIC_KEY_REQUIRED');
  }

  const nowMs = requireIsoInstant(now, 'now');
  const issuedAtMs = requireIsoInstant(claim.issuedAt, 'issuedAt');
  const expiresAtMs = requireIsoInstant(claim.expiresAt, 'expiresAt');
  if (nowMs < issuedAtMs) {
    throw new Error('TSN26_CLAIM_NOT_YET_VALID');
  }
  if (nowMs > expiresAtMs) {
    throw new Error('TSN26_CLAIM_EXPIRED');
  }

  if (!SELLER_ROLES.has(claim.sellerRole)) {
    throw new Error(`TSN26_INVALID_SELLER_ROLE:${String(claim.sellerRole)}`);
  }

  const computedHash = payloadHash(claim);
  if (computedHash !== claim.payloadHash) {
    throw new Error('TSN26_CLAIM_PAYLOAD_HASH_INVALID');
  }

  let signature;
  try {
    signature = Buffer.from(requireNonEmptyString(claim.signature, 'signature'), 'base64url');
  } catch {
    throw new Error('TSN26_CLAIM_SIGNATURE_INVALID');
  }

  const valid = crypto.verify(
    null,
    Buffer.from(canonicalPayload(claim), 'utf8'),
    publicKey,
    signature,
  );
  if (!valid) {
    throw new Error('TSN26_CLAIM_SIGNATURE_INVALID');
  }

  return true;
}

function resolveWinningClaim(claims, { explicitClaimId = null } = {}) {
  if (!Array.isArray(claims)) {
    throw new TypeError('TSN26_CLAIMS_MUST_BE_ARRAY');
  }
  const locked = claims.filter((claim) => claim && claim.status === 'LOCKED');
  if (locked.length === 0) {
    return null;
  }

  const ids = locked.map((claim) => claim.claimId);
  if (new Set(ids).size !== ids.length) {
    throw new Error('TSN26_DUPLICATE_SALE_CLAIM_ID');
  }

  if (explicitClaimId) {
    const winner = locked.find((claim) => claim.claimId === explicitClaimId);
    if (!winner) {
      throw new Error(`TSN26_EXPLICIT_CLAIM_NOT_FOUND:${explicitClaimId}`);
    }
    return winner;
  }

  if (locked.length > 1) {
    throw new Error('TSN26_AMBIGUOUS_SALE_CLAIMS');
  }
  return locked[0];
}

module.exports = {
  SELLER_ROLES,
  createUnsignedClaim,
  signAndLockClaim,
  verifyLockedClaim,
  resolveWinningClaim,
  canonicalPayload,
  payloadHash,
};
