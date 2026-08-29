'use strict';

const SCHEMA_VERSION = 'TIGER_SGF_MARKET_ACTIVATION_PASSPORT_V1';
const CAPABILITIES = new Set([
  'SOCIAL',
  'DISCOVERY',
  'MESSAGING',
  'ADS_DELIVERY',
  'ADS_BILLING',
  'PULSE',
  'AI_RECOMMENDATION',
  'DATA_EXPORT'
]);
const DIGEST_PATTERN = /^sha256:[0-9a-f]{64}$/;
const EVIDENCE_FIELDS = Object.freeze([
  'genomeDigest',
  'legalEvidenceDigest',
  'securityEvidenceDigest',
  'paymentEvidenceDigest',
  'privacyEvidenceDigest',
  'operationsEvidenceDigest',
  'ownerAuthorizationDigest'
]);

function passportError(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

function digest(value, code = 'SGF_PASSPORT_DIGEST_INVALID') {
  const normalized = String(value == null ? '' : value).trim().toLowerCase();
  if (!DIGEST_PATTERN.test(normalized)) throw passportError(code);
  return normalized;
}

function normalizePassport(passport) {
  const p = passport && typeof passport === 'object' && !Array.isArray(passport) ? passport : {};
  if (p.schemaVersion !== SCHEMA_VERSION) throw passportError('SGF_PASSPORT_SCHEMA_INVALID');

  const marketId = String(p.marketId == null ? '' : p.marketId).trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(marketId)) throw passportError('SGF_PASSPORT_MARKET_INVALID');

  const capability = String(p.capability == null ? '' : p.capability).trim().toUpperCase();
  if (!CAPABILITIES.has(capability)) throw passportError('SGF_PASSPORT_CAPABILITY_INVALID');

  const releaseText = String(p.releaseDigest == null ? '' : p.releaseDigest).trim().toLowerCase();
  if (releaseText === 'latest' || !DIGEST_PATTERN.test(releaseText)) {
    throw passportError('SGF_PASSPORT_RELEASE_INVALID');
  }

  const normalized = {
    schemaVersion: SCHEMA_VERSION,
    marketId,
    capability,
    releaseDigest: releaseText
  };
  for (const field of EVIDENCE_FIELDS) normalized[field] = digest(p[field]);

  const issuedAt = Date.parse(p.issuedAt);
  const expiresAt = Date.parse(p.expiresAt);
  if (!Number.isFinite(issuedAt) || !Number.isFinite(expiresAt) || expiresAt <= issuedAt) {
    throw passportError('SGF_PASSPORT_VALIDITY_INVALID');
  }
  normalized.issuedAt = new Date(issuedAt).toISOString();
  normalized.expiresAt = new Date(expiresAt).toISOString();

  if (p.revocationState !== 'ACTIVE') throw passportError('SGF_PASSPORT_REVOKED');
  normalized.revocationState = 'ACTIVE';

  const signature = p.signature;
  if (!signature || typeof signature !== 'object' ||
      typeof signature.keyId !== 'string' || !signature.keyId.trim() ||
      typeof signature.algorithm !== 'string' || !signature.algorithm.trim() ||
      typeof signature.value !== 'string' || !signature.value.trim()) {
    throw passportError('SGF_PASSPORT_SIGNATURE_INVALID');
  }

  return { normalized, signature };
}

function canonicalPayload(passport) {
  return JSON.stringify(passport);
}

async function authorizeMarketPassport(options) {
  const source = options && typeof options === 'object' ? options : {};
  const { normalized, signature } = normalizePassport(source.passport);
  const current = Number((typeof source.now === 'function' ? source.now : Date.now)());
  const issuedAt = Date.parse(normalized.issuedAt);
  const expiresAt = Date.parse(normalized.expiresAt);
  if (!Number.isFinite(current)) throw passportError('SGF_PASSPORT_CLOCK_INVALID');
  if (current < issuedAt) throw passportError('SGF_PASSPORT_NOT_YET_VALID');
  if (current >= expiresAt) throw passportError('SGF_PASSPORT_EXPIRED');

  const context = source.context && typeof source.context === 'object' ? source.context : {};
  if (
    String(context.marketId || '').trim().toUpperCase() !== normalized.marketId ||
    String(context.capability || '').trim().toUpperCase() !== normalized.capability ||
    String(context.genomeDigest || '').trim().toLowerCase() !== normalized.genomeDigest ||
    String(context.releaseDigest || '').trim().toLowerCase() !== normalized.releaseDigest
  ) {
    throw passportError('SGF_PASSPORT_CONTEXT_MISMATCH');
  }

  if (typeof source.verifySignature !== 'function') {
    throw passportError('SGF_PASSPORT_SIGNATURE_VERIFIER_REQUIRED');
  }
  const verified = await source.verifySignature({
    payload: canonicalPayload(normalized),
    signature: Object.freeze({ ...signature })
  });
  if (verified !== true) throw passportError('SGF_PASSPORT_SIGNATURE_INVALID');

  return Object.freeze({
    marketId: normalized.marketId,
    capability: normalized.capability,
    genomeDigest: normalized.genomeDigest,
    releaseDigest: normalized.releaseDigest,
    authorized: true
  });
}

module.exports = Object.freeze({
  SCHEMA_VERSION,
  authorizeMarketPassport
});
