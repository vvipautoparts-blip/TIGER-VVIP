'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { createMediaCellGenome, canonicalJson: genomeCanonicalJson } = require('./media-cell-genome.cjs');

const SHA256_PATTERN = /^[0-9a-f]{64}$/;
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
  return genomeCanonicalJson(value);
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

function validCount(value) {
  return Number.isInteger(value) && value >= 0;
}

function validateScan(scan) {
  exactKeys(
    scan,
    ['status', 'scanMode', 'scanCompletedAt', 'critical', 'high', 'medium', 'low', 'unknown', 'findingsSha256'],
    'PASSPORT_SCAN_UNKNOWN',
    'PASSPORT_SCAN_INVALID',
  );
  if ((scan.status !== 'COMPLETE' && scan.status !== 'ACTIVE') || scan.scanMode !== 'ENHANCED') fail('PASSPORT_SCAN_INVALID');
  if (typeof scan.scanCompletedAt !== 'string' || !scan.scanCompletedAt || Number.isNaN(Date.parse(scan.scanCompletedAt))) {
    fail('PASSPORT_SCAN_INVALID');
  }
  for (const severity of ['critical', 'high', 'medium', 'low', 'unknown']) {
    if (!validCount(scan[severity])) fail('PASSPORT_SCAN_INVALID');
  }
  if (!SHA256_PATTERN.test(scan.findingsSha256 || '')) fail('PASSPORT_SCAN_INVALID');
  if (scan.critical > 0 || scan.high > 0 || scan.medium > 0) fail('PASSPORT_SCAN_BLOCKED');
}

function validateSupplyGate(supplyGate) {
  exactKeys(
    supplyGate,
    ['decision', 'evidenceSha256'],
    'PASSPORT_SUPPLY_GATE_UNKNOWN',
    'PASSPORT_SUPPLY_GATE_INVALID',
  );
  if (supplyGate.decision !== 'PASS' || !SHA256_PATTERN.test(supplyGate.evidenceSha256 || '')) {
    fail('PASSPORT_SUPPLY_GATE_INVALID');
  }
}

function createMediaCellPassport(evidence = {}) {
  if (hasSecretMaterial(evidence)) fail('PASSPORT_SECRET_MATERIAL_REJECTED');
  exactKeys(
    evidence,
    ['source', 'materials', 'image', 'database', 'sbom', 'scan', 'attestations', 'supplyGate'],
    'PASSPORT_EVIDENCE_UNKNOWN',
    'PASSPORT_EVIDENCE_INVALID',
  );
  if (evidence?.sbom?.subjectDigest !== evidence?.image?.manifestDigest) fail('PASSPORT_SBOM_SUBJECT_MISMATCH');
  validateScan(evidence.scan);
  validateSupplyGate(evidence.supplyGate);

  const genomeEvidence = {
    source: evidence.source,
    materials: evidence.materials,
    image: evidence.image,
    database: evidence.database,
    sbom: evidence.sbom,
    attestations: evidence.attestations,
  };

  let genome;
  try {
    genome = createMediaCellGenome(genomeEvidence);
  } catch (error) {
    const message = String(error?.message || '');
    if (message.includes('ATTESTATION_UNVERIFIED')) fail('PASSPORT_ATTESTATION_UNVERIFIED');
    if (message.includes('SECRET_MATERIAL')) fail('PASSPORT_SECRET_MATERIAL_REJECTED');
    throw error;
  }

  return canonicalize({
    schemaVersion: 'tiger-release-passport-v2',
    genome: {
      schemaVersion: genome.schemaVersion,
      algorithm: genome.algorithm,
      id: genome.id,
    },
    source: genome.source,
    materials: genome.materials,
    image: {
      repository: evidence.image.repository,
      manifestDigest: evidence.image.manifestDigest,
      baseDigest: evidence.image.baseDigest,
    },
    database: {
      migrationSetSha256: evidence.database.migrationSetSha256,
      liveConvergence: 'NOT_EXECUTED_IN_SEALED_BUILD',
    },
    sbom: {
      specVersion: evidence.sbom.specVersion,
      sha256: evidence.sbom.sha256,
      subjectDigest: evidence.sbom.subjectDigest,
      path: evidence.sbom.path,
      componentCount: evidence.sbom.componentCount,
    },
    scan: {
      status: evidence.scan.status,
      scanMode: evidence.scan.scanMode,
      scanCompletedAt: evidence.scan.scanCompletedAt,
      critical: evidence.scan.critical,
      high: evidence.scan.high,
      medium: evidence.scan.medium,
      low: evidence.scan.low,
      unknown: evidence.scan.unknown,
      findingsSha256: evidence.scan.findingsSha256,
    },
    supplyGate: {
      decision: 'PASS',
      evidenceSha256: evidence.supplyGate.evidenceSha256,
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
      mode: 'SEALED_BUILD_ONLY',
      regionalDeployment: 'NOT_EXECUTED',
      edgeDeployment: 'NOT_EXECUTED',
      lambdaVersion: 'NOT_AVAILABLE',
      cloudFrontDistribution: 'NOT_AVAILABLE',
      wafWebAcl: 'NOT_AVAILABLE',
      runtimeProbes: 'NOT_EXECUTED',
      rollbackEvidence: 'NOT_APPLICABLE_NO_DEPLOYMENT',
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
