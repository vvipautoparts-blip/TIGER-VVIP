'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { createMediaCellGenome } = require('./media-cell-genome.cjs');

const OCI_SHA256_PATTERN = /^sha256:[0-9a-f]{64}$/;
const SECRET_KEY_PATTERN = /(?:secret|password|credential|access[_-]?key|service[_-]?role[_-]?key|private[_-]?key|authorization|session[_-]?token|capability[_-]?token)/i;
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

function hasSecretMaterial(value) {
  if (Array.isArray(value)) return value.some(hasSecretMaterial);
  if (value && typeof value === 'object') {
    return Object.entries(value).some(([key, entry]) => SECRET_KEY_PATTERN.test(key) || hasSecretMaterial(entry));
  }
  return typeof value === 'string' && SECRET_VALUE_PATTERNS.some((pattern) => pattern.test(value));
}

function exactKeys(value, allowed, unknownCode = 'PASSPORT_EVIDENCE_UNKNOWN', invalidCode = 'PASSPORT_EVIDENCE_INVALID') {
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

function validateGenome(genome) {
  exactKeys(
    genome,
    ['schemaVersion', 'genomeId', 'source', 'image', 'materials', 'dbMigrations', 'containerSbom', 'attestations'],
    'PASSPORT_GENOME_UNKNOWN',
    'PASSPORT_GENOME_INVALID',
  );
  if (genome.schemaVersion !== 'tiger-cryptographic-genome-v1' || !OCI_SHA256_PATTERN.test(genome.genomeId || '')) {
    fail('PASSPORT_GENOME_INVALID');
  }
  if (genome.attestations?.provenance?.verified !== true || genome.attestations?.sbom?.verified !== true) {
    fail('PASSPORT_ATTESTATION_UNVERIFIED');
  }

  const { schemaVersion: _schemaVersion, genomeId: _genomeId, ...evidence } = genome;
  let recomputed;
  try {
    recomputed = createMediaCellGenome(evidence);
  } catch {
    fail('PASSPORT_GENOME_INVALID');
  }
  if (recomputed.genomeId !== genome.genomeId) fail('PASSPORT_GENOME_MISMATCH');
}

function validateVulnerabilityGate(gate) {
  exactKeys(
    gate,
    ['scanType', 'frequency', 'critical', 'high'],
    'PASSPORT_VULNERABILITY_GATE_UNKNOWN',
    'PASSPORT_VULNERABILITY_GATE_INVALID',
  );
  if (
    gate.scanType !== 'ENHANCED' ||
    gate.frequency !== 'CONTINUOUS_SCAN' ||
    !Number.isSafeInteger(gate.critical) ||
    !Number.isSafeInteger(gate.high) ||
    gate.critical !== 0 ||
    gate.high !== 0
  ) {
    fail('PASSPORT_VULNERABILITY_GATE_REJECTED');
  }
}

function validateEvidence(evidence) {
  if (!evidence || typeof evidence !== 'object' || Array.isArray(evidence)) fail('PASSPORT_EVIDENCE_INVALID');
  if (hasSecretMaterial(evidence)) fail('PASSPORT_SECRET_MATERIAL_REJECTED');
  exactKeys(evidence, ['genome', 'vulnerabilityGate']);
  validateGenome(evidence.genome);
  validateVulnerabilityGate(evidence.vulnerabilityGate);
}

function createMediaCellPassport(evidence = {}) {
  validateEvidence(evidence);
  const { genome, vulnerabilityGate } = evidence;
  return {
    schemaVersion: 'tiger-release-passport-v2',
    genomeId: genome.genomeId,
    source: {
      commitSha: genome.source.commitSha,
      treeSha: genome.source.treeSha,
    },
    image: {
      repository: genome.image.repository,
      manifestDigest: genome.image.manifestDigest,
      baseDigest: genome.image.baseDigest,
    },
    containerSbom: {
      specVersion: '1.7',
      sha256: genome.containerSbom.sha256,
      componentCount: genome.containerSbom.componentCount,
      npmPackages: genome.containerSbom.npmPackages,
      osPackages: genome.containerSbom.osPackages,
    },
    vulnerabilityGate: {
      scanType: 'ENHANCED',
      frequency: 'CONTINUOUS_SCAN',
      critical: vulnerabilityGate.critical,
      high: vulnerabilityGate.high,
    },
    attestations: {
      provenance: {
        attestationId: genome.attestations.provenance.attestationId,
        verified: true,
      },
      sbom: {
        attestationId: genome.attestations.sbom.attestationId,
        verified: true,
      },
    },
  };
}

function writeCanonicalJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${canonicalJson(value)}\n`, { encoding: 'utf8', mode: 0o600 });
}

if (require.main === module) {
  const [inputFile, outputFile] = process.argv.slice(2);
  if (!inputFile || !outputFile) fail('USAGE:media-cell-passport.cjs <passport-evidence.json> <passport.json>');
  const evidence = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
  writeCanonicalJson(outputFile, createMediaCellPassport(evidence));
}

module.exports = Object.freeze({ createMediaCellPassport, canonicalJson });
