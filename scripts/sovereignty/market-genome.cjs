'use strict';

const { createHash } = require('node:crypto');

const SCHEMA_VERSION = 'TIGER_SGF_MARKET_GENOME_V1';
const DIGEST_FIELDS = Object.freeze([
  'legalPolicyDigest',
  'taxPolicyDigest',
  'privacyPolicyDigest',
  'dataResidencyPolicyDigest',
  'advertisingPolicyDigest',
  'paymentPolicyDigest',
  'aiPolicyDigest',
  'securityPolicyDigest',
  'runtimePolicyDigest',
  'releaseDigest',
  'ownerAuthorityDigest'
]);
const ALLOWED_FIELDS = new Set(['marketId', ...DIGEST_FIELDS]);
const DIGEST_PATTERN = /^sha256:[0-9a-f]{64}$/;

function genomeError(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

function requireDigest(value, release) {
  const text = String(value == null ? '' : value).trim().toLowerCase();
  if (release && text === 'latest') throw genomeError('SGF_GENOME_RELEASE_INVALID');
  if (!DIGEST_PATTERN.test(text)) {
    throw genomeError(release ? 'SGF_GENOME_RELEASE_INVALID' : 'SGF_GENOME_DIGEST_INVALID');
  }
  return text;
}

function buildMarketGenome(input) {
  const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  for (const key of Object.keys(source)) {
    if (!ALLOWED_FIELDS.has(key)) throw genomeError('SGF_GENOME_FIELD_FORBIDDEN');
  }

  const marketId = String(source.marketId == null ? '' : source.marketId).trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(marketId)) throw genomeError('SGF_GENOME_MARKET_INVALID');

  const payload = {
    schemaVersion: SCHEMA_VERSION,
    marketId
  };
  for (const field of DIGEST_FIELDS) {
    payload[field] = requireDigest(source[field], field === 'releaseDigest');
  }

  const canonical = JSON.stringify(payload);
  const digest = `sha256:${createHash('sha256').update(canonical, 'utf8').digest('hex')}`;
  return Object.freeze({ ...payload, genomeDigest: digest });
}

module.exports = Object.freeze({
  SCHEMA_VERSION,
  DIGEST_FIELDS,
  buildMarketGenome
});
