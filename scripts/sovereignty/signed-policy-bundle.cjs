'use strict';

const { createHash } = require('node:crypto');

const SCHEMA_VERSION = 'TIGER_SGF_SIGNED_POLICY_BUNDLE_V1';
const CAPABILITIES = new Set([
  'SOCIAL', 'DISCOVERY', 'MESSAGING', 'ADS_DELIVERY', 'ADS_BILLING', 'PULSE', 'AI_RECOMMENDATION', 'DATA_EXPORT'
]);
const ALLOWED_FIELDS = new Set([
  'schemaVersion', 'marketId', 'policyId', 'version', 'capabilities', 'contentDigest', 'issuedAt', 'validUntil', 'signature'
]);
const DIGEST_PATTERN = /^sha256:[0-9a-f]{64}$/;

function policyError(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

function payloadBuffer(value) {
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof Uint8Array) return Buffer.from(value.buffer, value.byteOffset, value.byteLength);
  if (typeof value === 'string') return Buffer.from(value, 'utf8');
  throw policyError('SGF_POLICY_PAYLOAD_INVALID');
}

function normalizeBundle(input) {
  const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  for (const key of Object.keys(source)) {
    if (!ALLOWED_FIELDS.has(key)) throw policyError('SGF_POLICY_FIELD_FORBIDDEN');
  }
  if (source.schemaVersion !== SCHEMA_VERSION) throw policyError('SGF_POLICY_SCHEMA_INVALID');
  const marketId = String(source.marketId == null ? '' : source.marketId).trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(marketId)) throw policyError('SGF_POLICY_MARKET_INVALID');
  const policyId = String(source.policyId == null ? '' : source.policyId).trim();
  if (!/^[A-Za-z0-9._-]{1,128}$/.test(policyId)) throw policyError('SGF_POLICY_ID_INVALID');
  const version = Number(source.version);
  if (!Number.isSafeInteger(version) || version < 1) throw policyError('SGF_POLICY_VERSION_INVALID');

  if (!Array.isArray(source.capabilities) || source.capabilities.length === 0 || source.capabilities.length > CAPABILITIES.size) {
    throw policyError('SGF_POLICY_CAPABILITIES_INVALID');
  }
  const capabilities = source.capabilities.map((value) => String(value || '').trim().toUpperCase());
  if (new Set(capabilities).size !== capabilities.length || capabilities.some((value) => !CAPABILITIES.has(value))) {
    throw policyError('SGF_POLICY_CAPABILITIES_INVALID');
  }

  const contentDigest = String(source.contentDigest == null ? '' : source.contentDigest).trim().toLowerCase();
  if (!DIGEST_PATTERN.test(contentDigest)) throw policyError('SGF_POLICY_DIGEST_INVALID');
  const issuedAtMs = Date.parse(source.issuedAt);
  const validUntilMs = Date.parse(source.validUntil);
  if (!Number.isFinite(issuedAtMs) || !Number.isFinite(validUntilMs) || validUntilMs <= issuedAtMs) {
    throw policyError('SGF_POLICY_VALIDITY_INVALID');
  }

  const signature = source.signature;
  if (!signature || typeof signature !== 'object' ||
      typeof signature.keyId !== 'string' || !signature.keyId.trim() ||
      typeof signature.algorithm !== 'string' || !signature.algorithm.trim() ||
      typeof signature.value !== 'string' || !signature.value.trim()) {
    throw policyError('SGF_POLICY_SIGNATURE_INVALID');
  }

  return {
    metadata: Object.freeze({
      schemaVersion: SCHEMA_VERSION,
      marketId,
      policyId,
      version,
      capabilities: Object.freeze([...capabilities]),
      contentDigest,
      issuedAt: new Date(issuedAtMs).toISOString(),
      validUntil: new Date(validUntilMs).toISOString()
    }),
    signature
  };
}

async function verifySignedPolicyBundle(options) {
  const source = options && typeof options === 'object' ? options : {};
  const { metadata, signature } = normalizeBundle(source.bundle);
  const bytes = payloadBuffer(source.payloadBytes);
  const actualDigest = `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
  if (actualDigest !== metadata.contentDigest) throw policyError('SGF_POLICY_CONTENT_DIGEST_MISMATCH');

  const current = Number((typeof source.now === 'function' ? source.now : Date.now)());
  if (!Number.isFinite(current)) throw policyError('SGF_POLICY_CLOCK_INVALID');
  if (current < Date.parse(metadata.issuedAt)) throw policyError('SGF_POLICY_NOT_YET_VALID');
  if (current >= Date.parse(metadata.validUntil)) throw policyError('SGF_POLICY_EXPIRED');

  if (typeof source.verifySignature !== 'function') throw policyError('SGF_POLICY_SIGNATURE_VERIFIER_REQUIRED');
  const verified = await source.verifySignature({
    payload: JSON.stringify(metadata),
    signature: Object.freeze({ ...signature })
  });
  if (verified !== true) throw policyError('SGF_POLICY_SIGNATURE_INVALID');

  return Object.freeze({
    verified: true,
    marketId: metadata.marketId,
    policyId: metadata.policyId,
    version: metadata.version,
    capabilities: metadata.capabilities,
    contentDigest: metadata.contentDigest
  });
}

module.exports = Object.freeze({ SCHEMA_VERSION, verifySignedPolicyBundle });
