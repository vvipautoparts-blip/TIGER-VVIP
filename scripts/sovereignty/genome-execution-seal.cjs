'use strict';

const SCHEMA_VERSION = 'TIGER_SGF_EXECUTION_SEAL_V1';
const MAX_TTL_MS = 5 * 60 * 1000;
const CAPABILITIES = new Set([
  'SOCIAL', 'DISCOVERY', 'MESSAGING', 'ADS_DELIVERY', 'ADS_BILLING', 'PULSE', 'AI_RECOMMENDATION', 'DATA_EXPORT'
]);
const DIGEST_PATTERN = /^sha256:[0-9a-f]{64}$/;
const DIGEST_FIELDS = Object.freeze(['genomeDigest', 'policyDigest', 'passportDigest']);

function sealError(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

function normalizeDigest(value, release = false) {
  const normalized = String(value == null ? '' : value).trim().toLowerCase();
  if (release && (normalized === 'latest' || !DIGEST_PATTERN.test(normalized))) {
    throw sealError('SGF_EXECUTION_RELEASE_INVALID');
  }
  if (!release && !DIGEST_PATTERN.test(normalized)) throw sealError('SGF_EXECUTION_DIGEST_INVALID');
  return normalized;
}

function normalizeSeal(seal) {
  const source = seal && typeof seal === 'object' && !Array.isArray(seal) ? seal : {};
  if (source.schemaVersion !== SCHEMA_VERSION) throw sealError('SGF_EXECUTION_SCHEMA_INVALID');

  const subject = String(source.subject == null ? '' : source.subject).trim();
  if (!subject || subject.length > 128) throw sealError('SGF_EXECUTION_SUBJECT_INVALID');
  const action = String(source.action == null ? '' : source.action).trim().toUpperCase();
  if (!/^[A-Z][A-Z0-9_]{1,63}$/.test(action)) throw sealError('SGF_EXECUTION_ACTION_INVALID');
  const marketId = String(source.marketId == null ? '' : source.marketId).trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(marketId)) throw sealError('SGF_EXECUTION_MARKET_INVALID');
  const capability = String(source.capability == null ? '' : source.capability).trim().toUpperCase();
  if (!CAPABILITIES.has(capability)) throw sealError('SGF_EXECUTION_CAPABILITY_INVALID');

  const normalized = {
    schemaVersion: SCHEMA_VERSION,
    subject,
    action,
    marketId,
    capability,
    releaseDigest: normalizeDigest(source.releaseDigest, true)
  };
  for (const field of DIGEST_FIELDS) normalized[field] = normalizeDigest(source[field]);

  const nonce = String(source.nonce == null ? '' : source.nonce).trim().toLowerCase();
  if (!/^[0-9a-f]{32,128}$/.test(nonce)) throw sealError('SGF_EXECUTION_NONCE_INVALID');
  normalized.nonce = nonce;

  const issuedAt = Date.parse(source.issuedAt);
  const expiresAt = Date.parse(source.expiresAt);
  if (!Number.isFinite(issuedAt) || !Number.isFinite(expiresAt) || expiresAt <= issuedAt) {
    throw sealError('SGF_EXECUTION_VALIDITY_INVALID');
  }
  if (expiresAt - issuedAt > MAX_TTL_MS) throw sealError('SGF_EXECUTION_TTL_EXCEEDED');
  normalized.issuedAt = new Date(issuedAt).toISOString();
  normalized.expiresAt = new Date(expiresAt).toISOString();

  const signature = source.signature;
  if (!signature || typeof signature !== 'object' ||
      typeof signature.keyId !== 'string' || !signature.keyId.trim() ||
      typeof signature.algorithm !== 'string' || !signature.algorithm.trim() ||
      typeof signature.value !== 'string' || !signature.value.trim()) {
    throw sealError('SGF_EXECUTION_SIGNATURE_INVALID');
  }
  return { normalized, signature };
}

function contextMatches(seal, context) {
  const c = context && typeof context === 'object' ? context : {};
  return String(c.subject || '').trim() === seal.subject &&
    String(c.action || '').trim().toUpperCase() === seal.action &&
    String(c.marketId || '').trim().toUpperCase() === seal.marketId &&
    String(c.capability || '').trim().toUpperCase() === seal.capability &&
    String(c.genomeDigest || '').trim().toLowerCase() === seal.genomeDigest &&
    String(c.releaseDigest || '').trim().toLowerCase() === seal.releaseDigest &&
    String(c.policyDigest || '').trim().toLowerCase() === seal.policyDigest &&
    String(c.passportDigest || '').trim().toLowerCase() === seal.passportDigest;
}

async function authorizeExecutionSeal(options) {
  const source = options && typeof options === 'object' ? options : {};
  const { normalized, signature } = normalizeSeal(source.seal);
  const current = Number((typeof source.now === 'function' ? source.now : Date.now)());
  if (!Number.isFinite(current)) throw sealError('SGF_EXECUTION_CLOCK_INVALID');
  const issuedAt = Date.parse(normalized.issuedAt);
  const expiresAt = Date.parse(normalized.expiresAt);
  if (current < issuedAt) throw sealError('SGF_EXECUTION_NOT_YET_VALID');
  if (current >= expiresAt) throw sealError('SGF_EXECUTION_EXPIRED');
  if (!contextMatches(normalized, source.context)) throw sealError('SGF_EXECUTION_CONTEXT_MISMATCH');

  if (typeof source.verifySignature !== 'function') throw sealError('SGF_EXECUTION_SIGNATURE_VERIFIER_REQUIRED');
  const verified = await source.verifySignature({
    payload: JSON.stringify(normalized),
    signature: Object.freeze({ ...signature })
  });
  if (verified !== true) throw sealError('SGF_EXECUTION_SIGNATURE_INVALID');

  if (typeof source.consumeNonce !== 'function') throw sealError('SGF_EXECUTION_NONCE_CONSUMER_REQUIRED');
  const consumed = await source.consumeNonce(normalized.nonce);
  if (consumed !== true) throw sealError('SGF_EXECUTION_REPLAY_DENIED');

  return Object.freeze({
    subject: normalized.subject,
    action: normalized.action,
    marketId: normalized.marketId,
    capability: normalized.capability,
    authorized: true
  });
}

module.exports = Object.freeze({ SCHEMA_VERSION, MAX_TTL_MS, authorizeExecutionSeal });
