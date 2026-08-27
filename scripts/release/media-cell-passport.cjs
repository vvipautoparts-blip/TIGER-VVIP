'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { createMediaCellGenome, canonicalJson: genomeCanonicalJson } = require('./media-cell-genome.cjs');

const SECRET_KEY_PATTERN = /(?:secret|password|credential|access[_-]?key|service[_-]?role[_-]?key|private[_-]?key|authorization|jwt|capability|signed[_-]?url)/i;
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
  return genomeCanonicalJson(value);
}

function hasSecretMaterial(value) {
  if (Array.isArray(value)) return value.some(hasSecretMaterial);
  if (value && typeof value === 'object') {
    return Object.entries(value).some(([key, entry]) => SECRET_KEY_PATTERN.test(key) || hasSecretMaterial(entry));
  }
  return typeof value === 'string' && SECRET_VALUE_PATTERNS.some((pattern) => pattern.test(value));
}

function exactTopLevelKeys(evidence) {
  const allowed = ['source', 'materials', 'image', 'database', 'sbom', 'scan', 'attestations'];
  if (!evidence || typeof evidence !== 'object' || Array.isArray(evidence)) fail('PASSPORT_EVIDENCE_INVALID');
  const actual = Object.keys(evidence).sort();
  const expected = [...allowed].sort();
  for (const key of actual) if (!expected.includes(key)) fail('PASSPORT_EVIDENCE_UNKNOWN');
  if (actual.length !== expected.length || expected.some((key) => !Object.hasOwn(evidence, key))) fail('PASSPORT_EVIDENCE_INVALID');
}

function createMediaCellPassport(evidence = {}) {
  if (hasSecretMaterial(evidence)) fail('PASSPORT_SECRET_MATERIAL_REJECTED');
  exactTopLevelKeys(evidence);
  if (evidence?.sbom?.subjectDigest !== evidence?.image?.manifestDigest) fail('PASSPORT_SBOM_SUBJECT_MISMATCH');
  if (evidence?.scan?.critical > 0) fail('PASSPORT_CRITICAL_FINDINGS_BLOCK');
  if (evidence?.scan?.high > 0) fail('PASSPORT_HIGH_FINDINGS_BLOCK');

  let genome;
  try {
    genome = createMediaCellGenome(evidence);
  } catch (error) {
    if (String(error?.message || '').includes('ATTESTATION_UNVERIFIED')) fail('PASSPORT_ATTESTATION_UNVERIFIED');
    fail('PASSPORT_EVIDENCE_INVALID');
  }

  return canonicalize({
    schemaVersion: 'tiger-release-passport-v2',
    genome: {
      schemaVersion: genome.schemaVersion,
      algorithm: genome.algorithm,
      id: genome.id,
    },
    source: {
      commitSha: evidence.source.commitSha,
      treeSha: evidence.source.treeSha,
      immutable: true,
    },
    materials: genome.materials,
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
    scan: {
      status: 'COMPLETE',
      critical: evidence.scan.critical,
      high: evidence.scan.high,
      medium: evidence.scan.medium,
      low: evidence.scan.low,
      findingsSha256: evidence.scan.findingsSha256,
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
    deployment: {
      mode: 'sealed-build-only',
      runtimeRegion: 'ap-northeast-2',
      edgeControlRegion: 'us-east-1',
      regionalStack: null,
      edgeStack: null,
      lambdaVersion: null,
      cloudFrontDistribution: null,
      wafWebAcl: null,
    },
  });
}

function writeCanonicalJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${canonicalJson(value)}\n`, { encoding: 'utf8', mode: 0o600 });
}

if (require.main === module) {
  const [inputFile, outputFile] = process.argv.slice(2);
  if (!inputFile || !outputFile) fail('USAGE:media-cell-passport.cjs <evidence.json> <passport.json>');
  const evidence = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
  writeCanonicalJson(outputFile, createMediaCellPassport(evidence));
}

module.exports = Object.freeze({ createMediaCellPassport, canonicalJson });
