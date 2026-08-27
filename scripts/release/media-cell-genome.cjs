'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const GIT_SHA_PATTERN = /^[0-9a-f]{40}$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const OCI_SHA256_PATTERN = /^sha256:[0-9a-f]{64}$/;
const SEOUL_ECR_REPOSITORY_PATTERN = /^[0-9]{12}\.dkr\.ecr\.ap-northeast-2\.amazonaws\.com\/[a-z0-9]+(?:[._/-][a-z0-9]+)*$/;
const SECRET_KEY_PATTERN = /(?:secret|password|credential|access[_-]?key|service[_-]?role[_-]?key|private[_-]?key|authorization|session[_-]?token|capability[_-]?token)/i;
const SECRET_VALUE_PATTERNS = Object.freeze([
  /sb_secret_[A-Za-z0-9._-]+/,
  /AKIA[0-9A-Z]{16}/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /gh[pousr]_[A-Za-z0-9_]{20,}/,
  /Bearer\s+[A-Za-z0-9._~+\/-]+=*/i,
]);

const REQUIRED_MATERIALS = Object.freeze([
  'services/media-finalizer/Dockerfile',
  'services/media-finalizer/package-lock.json',
  'infra/media-finalizer/foundation/template.yaml',
  'infra/media-finalizer/foundation/guard.guard',
  'infra/media-finalizer/regional/template.yaml',
  'infra/media-finalizer/regional/guard.guard',
  'infra/media-finalizer/edge/template.yaml',
  'infra/media-finalizer/edge/guard.guard',
]);

const REQUIRED_DB_MIGRATIONS = Object.freeze([
  'supabase/migrations/20260816090001_sovereign_media_finalization.sql',
  'supabase/migrations/20260826120000_synapse_proof_of_now.sql',
  'supabase/migrations/20260827120000_sealed_media_identity_binding.sql',
]);

function fail(code) {
  throw new Error(code);
}

function hasSecretMaterial(value) {
  if (Array.isArray(value)) return value.some(hasSecretMaterial);
  if (value && typeof value === 'object') {
    return Object.entries(value).some(([key, entry]) => SECRET_KEY_PATTERN.test(key) || hasSecretMaterial(entry));
  }
  return typeof value === 'string' && SECRET_VALUE_PATTERNS.some((pattern) => pattern.test(value));
}

function exactKeys(value, allowed, unknownCode, invalidCode) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(invalidCode);
  const actual = Object.keys(value).sort();
  const expected = [...allowed].sort();
  for (const key of actual) if (!expected.includes(key)) fail(unknownCode);
  if (actual.length !== expected.length || expected.some((key) => !Object.hasOwn(value, key))) fail(invalidCode);
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalize(value[key])]),
    );
  }
  return value;
}

function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

function validateDigestMap(value, required, code) {
  exactKeys(value, required, code, code);
  for (const name of required) if (!SHA256_PATTERN.test(value[name] || '')) fail(code);
}

function validateAttestation(value) {
  exactKeys(
    value,
    ['attestationId', 'verified', 'evidenceSha256'],
    'GENOME_ATTESTATION_UNKNOWN',
    'GENOME_ATTESTATION_INVALID',
  );
  if (value.verified !== true) fail('GENOME_ATTESTATION_UNVERIFIED');
  if (
    typeof value.attestationId !== 'string' ||
    value.attestationId.length < 3 ||
    value.attestationId.length > 1024 ||
    /[\u0000-\u001f\u007f]/.test(value.attestationId) ||
    !SHA256_PATTERN.test(value.evidenceSha256 || '')
  ) {
    fail('GENOME_ATTESTATION_INVALID');
  }
}

function validateEvidence(evidence) {
  if (!evidence || typeof evidence !== 'object' || Array.isArray(evidence)) fail('GENOME_EVIDENCE_INVALID');
  if (hasSecretMaterial(evidence)) fail('GENOME_SECRET_MATERIAL_REJECTED');
  exactKeys(
    evidence,
    ['source', 'image', 'materials', 'dbMigrations', 'containerSbom', 'attestations'],
    'GENOME_EVIDENCE_UNKNOWN',
    'GENOME_EVIDENCE_INVALID',
  );

  exactKeys(evidence.source, ['commitSha', 'treeSha', 'immutable'], 'GENOME_SOURCE_UNKNOWN', 'GENOME_SOURCE_INVALID');
  if (
    !GIT_SHA_PATTERN.test(evidence.source.commitSha || '') ||
    !GIT_SHA_PATTERN.test(evidence.source.treeSha || '') ||
    evidence.source.immutable !== true
  ) {
    fail('GENOME_SOURCE_INVALID');
  }

  exactKeys(evidence.image, ['repository', 'manifestDigest', 'baseDigest'], 'GENOME_IMAGE_UNKNOWN', 'GENOME_IMAGE_INVALID');
  if (!SEOUL_ECR_REPOSITORY_PATTERN.test(evidence.image.repository || '')) fail('GENOME_IMAGE_REPOSITORY_INVALID');
  if (
    !OCI_SHA256_PATTERN.test(evidence.image.manifestDigest || '') ||
    !OCI_SHA256_PATTERN.test(evidence.image.baseDigest || '')
  ) {
    fail('GENOME_IMAGE_DIGEST_INVALID');
  }

  validateDigestMap(evidence.materials, REQUIRED_MATERIALS, 'GENOME_MATERIALS_INVALID');
  validateDigestMap(evidence.dbMigrations, REQUIRED_DB_MIGRATIONS, 'GENOME_DB_MIGRATIONS_INVALID');

  exactKeys(
    evidence.containerSbom,
    ['specVersion', 'sha256', 'componentCount', 'npmPackages', 'osPackages'],
    'GENOME_CONTAINER_SBOM_UNKNOWN',
    'GENOME_CONTAINER_SBOM_INVALID',
  );
  if (
    evidence.containerSbom.specVersion !== '1.7' ||
    !SHA256_PATTERN.test(evidence.containerSbom.sha256 || '') ||
    !Number.isSafeInteger(evidence.containerSbom.componentCount) ||
    evidence.containerSbom.componentCount < 2 ||
    !Number.isSafeInteger(evidence.containerSbom.npmPackages) ||
    evidence.containerSbom.npmPackages < 1 ||
    !Number.isSafeInteger(evidence.containerSbom.osPackages) ||
    evidence.containerSbom.osPackages < 1 ||
    evidence.containerSbom.npmPackages > evidence.containerSbom.componentCount ||
    evidence.containerSbom.osPackages > evidence.containerSbom.componentCount
  ) {
    fail('GENOME_CONTAINER_SBOM_INVALID');
  }

  exactKeys(
    evidence.attestations,
    ['provenance', 'sbom'],
    'GENOME_ATTESTATIONS_UNKNOWN',
    'GENOME_ATTESTATIONS_INVALID',
  );
  validateAttestation(evidence.attestations.provenance);
  validateAttestation(evidence.attestations.sbom);
}

function createMediaCellGenome(evidence = {}) {
  validateEvidence(evidence);
  const validated = canonicalize(JSON.parse(JSON.stringify(evidence)));
  const identityPayload = {
    schemaVersion: 'tiger-cryptographic-genome-v1',
    ...validated,
  };
  const genomeId = `sha256:${crypto.createHash('sha256').update(canonicalJson(identityPayload)).digest('hex')}`;
  return {
    schemaVersion: 'tiger-cryptographic-genome-v1',
    genomeId,
    ...validated,
  };
}

function writeCanonicalJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${canonicalJson(value)}\n`, { encoding: 'utf8', mode: 0o600 });
}

if (require.main === module) {
  const [inputFile, outputFile] = process.argv.slice(2);
  if (!inputFile || !outputFile) fail('USAGE:media-cell-genome.cjs <evidence.json> <genome.json>');
  const evidence = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
  writeCanonicalJson(outputFile, createMediaCellGenome(evidence));
}

module.exports = Object.freeze({
  createMediaCellGenome,
  canonicalJson,
  REQUIRED_MATERIALS,
  REQUIRED_DB_MIGRATIONS,
});
