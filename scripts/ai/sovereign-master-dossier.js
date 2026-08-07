'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const proof = require('./sovereign-proof-system');

const REPO_ROOT = fs.realpathSync(path.resolve(__dirname, '../..'));
const SOURCE_SCHEMA = 'TIGER_DOSSIER_REPOSITORY_SOURCE_V1';
const CLAIM_SCHEMA = 'TIGER_DOSSIER_CLAIM_V1';
const MAX_SOURCE_BYTES = 16 * 1024 * 1024;
const UNSAFE_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
const SOURCE_FIELDS = Object.freeze(['releaseDNA', 'path']);
const CLAIM_FIELDS = Object.freeze(['releaseDNA', 'id', 'sectionId', 'title', 'claimType', 'truthState', 'statement', 'sources']);
const RECONCILE_FIELDS = Object.freeze(['claim', 'releaseDNA']);
const GAP_FIELDS = Object.freeze(['releaseDNA', 'claims']);
const CLAIM_TYPES = new Set([
  'REPOSITORY_IMPLEMENTATION',
  'RUNTIME',
  'MEASUREMENT',
  'MANUAL_ACCEPTANCE',
  'GOVERNANCE',
  'DESIGN',
]);
const TRUTH_STATES = new Set(['VERIFIED', 'DESIGNED', 'PENDING', 'STALE', 'BLOCKED']);
const trustedRepositorySources = new WeakSet();
const trustedClaims = new WeakSet();

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function isPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function assertExactKeys(value, allowed, code) {
  if (!isPlainObject(value)) fail(code);
  const allowedSet = new Set(allowed);
  for (const key of Object.keys(value)) {
    if (UNSAFE_KEYS.has(key)) fail('UNSAFE_KEY');
    if (!allowedSet.has(key)) fail(code);
  }
}

function assertRequired(value, fields, code) {
  for (const field of fields) {
    if (!Object.prototype.hasOwnProperty.call(value, field)) fail(code);
  }
}

function boundedString(value, min, max, code, pattern = null) {
  if (typeof value !== 'string') fail(code);
  const normalized = value.trim();
  if (normalized.length < min || normalized.length > max) fail(code);
  if (/\u0000|[\u0001-\u0008\u000b\u000c\u000e-\u001f]/.test(normalized)) fail(code);
  if (pattern && !pattern.test(normalized)) fail(code);
  return normalized;
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function sha256Bytes(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function canonicalSectionIds() {
  const catalog = require('./sovereign-master-dossier-catalog');
  return new Set(catalog.SECTIONS.map((section) => section.id));
}

function assertReleaseDNA(value, code) {
  if (!proof.verifyReleaseDNAIntegrity(value)) fail(code);
}

function normalizeRepoPath(value) {
  const candidate = boundedString(value, 1, 512, 'DOSSIER_SOURCE_PATH_INVALID');
  if (path.isAbsolute(candidate) || candidate.includes('\\') || candidate.startsWith('/')) fail('DOSSIER_SOURCE_PATH_INVALID');
  const segments = candidate.split('/');
  if (segments.some((segment) => !segment || segment === '.' || segment === '..')) fail('DOSSIER_SOURCE_PATH_INVALID');
  const normalized = path.posix.normalize(candidate);
  if (normalized !== candidate || normalized.startsWith('../')) fail('DOSSIER_SOURCE_PATH_INVALID');
  return normalized;
}

function resolveTrustedFile(relativePath) {
  const candidate = path.resolve(REPO_ROOT, ...relativePath.split('/'));
  if (candidate === REPO_ROOT || !candidate.startsWith(`${REPO_ROOT}${path.sep}`)) fail('DOSSIER_SOURCE_PATH_INVALID');
  let real;
  try {
    real = fs.realpathSync(candidate);
  } catch (_) {
    fail('DOSSIER_SOURCE_NOT_FOUND');
  }
  if (!real.startsWith(`${REPO_ROOT}${path.sep}`)) fail('DOSSIER_SOURCE_PATH_INVALID');
  const stat = fs.statSync(real);
  if (!stat.isFile()) fail('DOSSIER_SOURCE_NOT_FILE');
  if (stat.size > MAX_SOURCE_BYTES) fail('DOSSIER_SOURCE_TOO_LARGE');
  return { real, stat };
}

function createRepositorySourceFact(input) {
  assertExactKeys(input, SOURCE_FIELDS, 'DOSSIER_SOURCE_UNKNOWN_FIELD');
  assertRequired(input, SOURCE_FIELDS, 'DOSSIER_SOURCE_REQUIRED_FIELD');
  assertReleaseDNA(input.releaseDNA, 'DOSSIER_SOURCE_RELEASE_DNA_INVALID');
  const relativePath = normalizeRepoPath(input.path);
  const { real, stat } = resolveTrustedFile(relativePath);
  const bytes = fs.readFileSync(real);
  const fact = deepFreeze({
    schemaVersion: SOURCE_SCHEMA,
    sourceType: 'REPOSITORY_BYTES',
    releaseDigest: input.releaseDNA.digest,
    path: relativePath,
    sha256: sha256Bytes(bytes),
    byteLength: stat.size,
    provenanceBoundary: 'CURRENT_CHECKOUT_BYTES',
  });
  trustedRepositorySources.add(fact);
  return fact;
}

function isTrustedRepositorySourceFact(value) {
  return Boolean(value && trustedRepositorySources.has(value));
}

function validateSources(sources, releaseDigest) {
  if (!Array.isArray(sources) || sources.length > 128) fail('DOSSIER_CLAIM_SOURCES_INVALID');
  const seen = new Set();
  for (const source of sources) {
    if (!isTrustedRepositorySourceFact(source)) fail('DOSSIER_CLAIM_SOURCE_UNTRUSTED');
    if (source.releaseDigest !== releaseDigest) fail('DOSSIER_CLAIM_SOURCE_RELEASE_MISMATCH');
    const key = `${source.path}:${source.sha256}`;
    if (seen.has(key)) fail('DOSSIER_CLAIM_SOURCE_DUPLICATE');
    seen.add(key);
  }
  return sources;
}

function createClaim(input) {
  assertExactKeys(input, CLAIM_FIELDS, 'DOSSIER_CLAIM_UNKNOWN_FIELD');
  assertRequired(input, CLAIM_FIELDS, 'DOSSIER_CLAIM_REQUIRED_FIELD');
  assertReleaseDNA(input.releaseDNA, 'DOSSIER_CLAIM_RELEASE_DNA_INVALID');

  const id = boundedString(input.id, 3, 128, 'DOSSIER_CLAIM_ID_INVALID', /^[A-Za-z0-9][A-Za-z0-9._:-]*$/);
  const sectionId = boundedString(input.sectionId, 3, 128, 'DOSSIER_CLAIM_SECTION_INVALID');
  if (!canonicalSectionIds().has(sectionId)) fail('DOSSIER_CLAIM_SECTION_INVALID');
  const title = boundedString(input.title, 1, 256, 'DOSSIER_CLAIM_TITLE_INVALID');
  const statement = boundedString(input.statement, 1, 4096, 'DOSSIER_CLAIM_STATEMENT_INVALID');
  const claimType = String(input.claimType || '').trim().toUpperCase();
  const truthState = String(input.truthState || '').trim().toUpperCase();
  if (!CLAIM_TYPES.has(claimType)) fail('DOSSIER_CLAIM_TYPE_INVALID');
  if (!TRUTH_STATES.has(truthState)) fail('DOSSIER_CLAIM_TRUTH_STATE_INVALID');
  const sources = validateSources(input.sources, input.releaseDNA.digest);

  if (truthState === 'VERIFIED' && claimType === 'DESIGN') fail('DESIGN_CLAIM_CANNOT_BE_VERIFIED');
  if (truthState === 'VERIFIED' && claimType === 'MEASUREMENT') fail('VERIFIED_MEASUREMENT_REQUIRES_TRUSTED_MEASUREMENT');
  if (truthState === 'VERIFIED' && claimType === 'MANUAL_ACCEPTANCE') fail('VERIFIED_MANUAL_ACCEPTANCE_REQUIRES_MANUAL_EVIDENCE');
  if (truthState === 'VERIFIED' && claimType === 'RUNTIME') fail('VERIFIED_RUNTIME_CLAIM_REQUIRES_TRUSTED_RUNTIME_EVIDENCE');
  if (truthState === 'VERIFIED' && claimType === 'REPOSITORY_IMPLEMENTATION' && sources.length === 0) {
    fail('VERIFIED_REPOSITORY_CLAIM_REQUIRES_TRUSTED_SOURCE');
  }

  const claim = deepFreeze({
    schemaVersion: CLAIM_SCHEMA,
    releaseDigest: input.releaseDNA.digest,
    id,
    sectionId,
    title,
    claimType,
    truthState,
    statement,
    sources: [...sources],
    reverificationRequired: truthState === 'STALE',
  });
  trustedClaims.add(claim);
  return claim;
}

function isTrustedClaim(value) {
  return Boolean(value && trustedClaims.has(value));
}

function reconcileClaimForRelease(input) {
  assertExactKeys(input, RECONCILE_FIELDS, 'DOSSIER_RECONCILE_UNKNOWN_FIELD');
  assertRequired(input, RECONCILE_FIELDS, 'DOSSIER_RECONCILE_REQUIRED_FIELD');
  assertReleaseDNA(input.releaseDNA, 'DOSSIER_RECONCILE_RELEASE_DNA_INVALID');
  if (!isTrustedClaim(input.claim)) fail('DOSSIER_RECONCILE_CLAIM_UNTRUSTED');
  if (input.claim.releaseDigest === input.releaseDNA.digest) return input.claim;

  const stale = deepFreeze({
    ...input.claim,
    releaseDigest: input.releaseDNA.digest,
    originalReleaseDigest: input.claim.releaseDigest,
    truthState: 'STALE',
    sources: [],
    reverificationRequired: true,
  });
  trustedClaims.add(stale);
  return stale;
}

function deriveGapRegister(input) {
  assertExactKeys(input, GAP_FIELDS, 'DOSSIER_GAPS_UNKNOWN_FIELD');
  assertRequired(input, GAP_FIELDS, 'DOSSIER_GAPS_REQUIRED_FIELD');
  assertReleaseDNA(input.releaseDNA, 'DOSSIER_GAPS_RELEASE_DNA_INVALID');
  if (!Array.isArray(input.claims) || input.claims.length > 4096) fail('DOSSIER_GAPS_CLAIMS_INVALID');

  const gaps = [];
  for (const claim of input.claims) {
    if (!isTrustedClaim(claim)) fail('DOSSIER_GAPS_CLAIM_UNTRUSTED');
    if (claim.releaseDigest !== input.releaseDNA.digest) fail('DOSSIER_GAPS_RELEASE_MISMATCH');
    if (claim.truthState === 'VERIFIED') continue;
    gaps.push(deepFreeze({
      schemaVersion: 'TIGER_DOSSIER_GAP_V1',
      claimId: claim.id,
      sectionId: claim.sectionId,
      truthState: claim.truthState,
      title: claim.title,
      statement: claim.statement,
      releaseDigest: claim.releaseDigest,
      reverificationRequired: claim.truthState === 'STALE' || claim.reverificationRequired === true,
    }));
  }
  return deepFreeze(gaps);
}

module.exports = Object.freeze({
  createRepositorySourceFact,
  isTrustedRepositorySourceFact,
  createClaim,
  isTrustedClaim,
  reconcileClaimForRelease,
  deriveGapRegister,
});
