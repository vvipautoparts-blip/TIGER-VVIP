'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const GIT_SHA_PATTERN = /^[0-9a-f]{40}$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const OCI_SHA256_PATTERN = /^sha256:[0-9a-f]{64}$/;
const SOURCE_REPOSITORY = 'vvipautoparts-blip/TIGER-VVIP';
const SEOUL_ECR_PATTERN = /^[0-9]{12}\.dkr\.ecr\.ap-northeast-2\.amazonaws\.com\/[a-z0-9]+(?:[._/-][a-z0-9]+)*$/;
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
const SECRET_KEY_PATTERN = /(?:secret|password|credential|access[_-]?key|service[_-]?role[_-]?key|private[_-]?key|authorization|jwt|session|capability|signed[_-]?url|raw[_-]?media|request[_-]?body)/i;
const SECRET_VALUE_PATTERNS = Object.freeze([
  /sb_secret_[A-Za-z0-9._-]+/,
  /AKIA[0-9A-Z]{16}/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /gh[pousr]_[A-Za-z0-9_]{20,}/,
  /Bearer\s+[A-Za-z0-9._~+\/-]+=*/i,
]);

function fail(code) {
  throw new Error(code);
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  }
  return value;
}

function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

function exactKeys(value, allowed, unknownCode = 'GENOME_EVIDENCE_UNKNOWN', invalidCode = 'GENOME_EVIDENCE_INVALID') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(invalidCode);
  const actual = Object.keys(value).sort();
  const expected = [...allowed].sort();
  for (const key of actual) if (!expected.includes(key)) fail(unknownCode);
  if (actual.length !== expected.length || expected.some((key) => !Object.hasOwn(value, key))) fail(invalidCode);
}

function hasSecretMaterial(value) {
  if (Array.isArray(value)) return value.some(hasSecretMaterial);
  if (value && typeof value === 'object') {
    return Object.entries(value).some(([key, entry]) => SECRET_KEY_PATTERN.test(key) || hasSecretMaterial(entry));
  }
  return typeof value === 'string' && SECRET_VALUE_PATTERNS.some((pattern) => pattern.test(value));
}

function validateGenomeEvidence(evidence) {
  if (hasSecretMaterial(evidence)) fail('GENOME_SECRET_MATERIAL_REJECTED');
  exactKeys(evidence, ['source', 'materials', 'image', 'database', 'sbom', 'attestations']);
  exactKeys(evidence.source, ['repository', 'commitSha', 'treeSha', 'mainSha', 'immutable', 'eligibility']);
  exactKeys(
    evidence.source.eligibility,
    ['state', 'dbConvergenceState', 'dbConvergenceEvidenceSha256'],
    'GENOME_SOURCE_ELIGIBILITY_INVALID',
    'GENOME_SOURCE_ELIGIBILITY_INVALID',
  );
  exactKeys(evidence.materials, REQUIRED_MATERIALS);
  exactKeys(evidence.image, ['repository', 'manifestDigest', 'baseDigest']);
  exactKeys(evidence.database, ['migrationSetSha256']);
  exactKeys(evidence.sbom, ['specVersion', 'sha256', 'subjectDigest', 'path', 'componentCount']);
  exactKeys(evidence.attestations, ['provenance', 'sbom']);
  exactKeys(evidence.attestations.provenance, ['verified', 'evidenceSha256']);
  exactKeys(evidence.attestations.sbom, ['verified', 'evidenceSha256']);

  if (
    evidence.source.repository !== SOURCE_REPOSITORY
    || !GIT_SHA_PATTERN.test(evidence.source.commitSha || '')
    || !GIT_SHA_PATTERN.test(evidence.source.treeSha || '')
    || !GIT_SHA_PATTERN.test(evidence.source.mainSha || '')
    || evidence.source.immutable !== true
  ) {
    fail('GENOME_SOURCE_INVALID');
  }
  if (
    evidence.source.mainSha !== evidence.source.commitSha
    || evidence.source.eligibility.state !== 'VERIFIED_CURRENT_PROTECTED_MAIN'
    || evidence.source.eligibility.dbConvergenceState !== 'VERIFIED_LIVE'
    || !SHA256_PATTERN.test(evidence.source.eligibility.dbConvergenceEvidenceSha256 || '')
  ) {
    fail('GENOME_SOURCE_ELIGIBILITY_INVALID');
  }
  for (const name of REQUIRED_MATERIALS) {
    if (!SHA256_PATTERN.test(evidence.materials[name] || '')) fail('GENOME_MATERIAL_DIGEST_INVALID');
  }
  if (!SEOUL_ECR_PATTERN.test(evidence.image.repository || '') || !OCI_SHA256_PATTERN.test(evidence.image.manifestDigest || '') || !OCI_SHA256_PATTERN.test(evidence.image.baseDigest || '')) {
    fail('GENOME_IMAGE_INVALID');
  }
  if (!SHA256_PATTERN.test(evidence.database.migrationSetSha256 || '')) fail('GENOME_DATABASE_INVALID');
  if (evidence.sbom.specVersion !== '1.7') fail('GENOME_SBOM_INVALID');
  if (!SHA256_PATTERN.test(evidence.sbom.sha256 || '') || !OCI_SHA256_PATTERN.test(evidence.sbom.subjectDigest || '')) fail('GENOME_SBOM_INVALID');
  if (evidence.sbom.subjectDigest !== evidence.image.manifestDigest) fail('GENOME_SBOM_SUBJECT_MISMATCH');
  if (evidence.sbom.path !== 'artifacts/media-cell/oci-sbom.cdx.json') fail('GENOME_SBOM_INVALID');
  if (!Number.isInteger(evidence.sbom.componentCount) || evidence.sbom.componentCount < 1) fail('GENOME_SBOM_INVALID');

  for (const attestation of [evidence.attestations.provenance, evidence.attestations.sbom]) {
    if (attestation.verified !== true) fail('GENOME_ATTESTATION_UNVERIFIED');
    if (!SHA256_PATTERN.test(attestation.evidenceSha256 || '')) fail('GENOME_ATTESTATION_INVALID');
  }
}

function createMediaCellGenome(evidence = {}) {
  validateGenomeEvidence(evidence);
  const authority = {
    schemaVersion: 'tiger-cryptographic-genome-v1',
    algorithm: 'sha256',
    source: {
      repository: evidence.source.repository,
      commitSha: evidence.source.commitSha,
      treeSha: evidence.source.treeSha,
      mainSha: evidence.source.mainSha,
      immutable: true,
      eligibility: {
        state: 'VERIFIED_CURRENT_PROTECTED_MAIN',
        dbConvergenceState: 'VERIFIED_LIVE',
        dbConvergenceEvidenceSha256: evidence.source.eligibility.dbConvergenceEvidenceSha256,
      },
    },
    materials: Object.fromEntries(REQUIRED_MATERIALS.map((name) => [name, evidence.materials[name]])),
    image: {
      repository: evidence.image.repository,
      manifestDigest: evidence.image.manifestDigest,
      baseDigest: evidence.image.baseDigest,
    },
    database: {
      migrationSetSha256: evidence.database.migrationSetSha256,
    },
    sbom: {
      specVersion: '1.7',
      sha256: evidence.sbom.sha256,
      subjectDigest: evidence.sbom.subjectDigest,
      path: evidence.sbom.path,
      componentCount: evidence.sbom.componentCount,
    },
    attestations: {
      provenance: {
        verified: true,
        evidenceSha256: evidence.attestations.provenance.evidenceSha256,
      },
      sbom: {
        verified: true,
        evidenceSha256: evidence.attestations.sbom.evidenceSha256,
      },
    },
  };
  const id = crypto.createHash('sha256').update(canonicalJson(authority)).digest('hex');
  return canonicalize({ ...authority, id });
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
  REQUIRED_MATERIALS,
  createMediaCellGenome,
  canonicalJson,
  validateGenomeEvidence,
});
