'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { validateRealContainerSbom, canonicalJson } = require('./media-cell-sbom.cjs');

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
  if (hasSecretMaterial(scan)) fail('SUPPLY_GATE_SECRET_MATERIAL_REJECTED');
  exactKeys(
    scan,
    ['status', 'scanMode', 'critical', 'high', 'medium', 'low', 'unknown', 'findingsSha256'],
    'SUPPLY_GATE_SCAN_UNKNOWN',
    'SUPPLY_GATE_SCAN_INVALID',
  );
  if (scan.status !== 'COMPLETE') fail('SUPPLY_GATE_SCAN_INCOMPLETE');
  if (scan.scanMode !== 'ENHANCED') fail('SUPPLY_GATE_SCAN_MODE_INVALID');
  for (const severity of ['critical', 'high', 'medium', 'low', 'unknown']) {
    if (!validCount(scan[severity])) fail('SUPPLY_GATE_SCAN_INVALID');
  }
  if (!SHA256_PATTERN.test(scan.findingsSha256 || '')) fail('SUPPLY_GATE_SCAN_INVALID');
}

function evaluateSupplyGate(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail('SUPPLY_GATE_INPUT_INVALID');
  if (hasSecretMaterial(input)) fail('SUPPLY_GATE_SECRET_MATERIAL_REJECTED');
  exactKeys(input, ['sbom', 'expectedManifestDigest', 'scan'], 'SUPPLY_GATE_INPUT_UNKNOWN', 'SUPPLY_GATE_INPUT_INVALID');

  const sbom = validateRealContainerSbom(input.sbom, input.expectedManifestDigest);
  validateScan(input.scan);
  if (input.scan.critical > 0) fail('SUPPLY_GATE_CRITICAL_BLOCK');
  if (input.scan.high > 0) fail('SUPPLY_GATE_HIGH_BLOCK');
  if (input.scan.medium > 0) fail('SUPPLY_GATE_MEDIUM_REVIEW_REQUIRED');

  return Object.freeze({
    decision: 'PASS',
    scanMode: 'ENHANCED',
    sbomSha256: sbom.sha256,
    subjectDigest: sbom.subjectDigest,
    repository: sbom.repository,
    imageUri: sbom.imageUri,
    componentCount: sbom.componentCount,
    findingsSha256: input.scan.findingsSha256,
    counts: Object.freeze({
      critical: input.scan.critical,
      high: input.scan.high,
      medium: input.scan.medium,
      low: input.scan.low,
      unknown: input.scan.unknown,
    }),
  });
}

function writeCanonicalJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${canonicalJson(value)}\n`, { encoding: 'utf8', mode: 0o600 });
}

if (require.main === module) {
  const [sbomFile, scanFile, manifestDigest, outputFile] = process.argv.slice(2);
  if (!sbomFile || !scanFile || !manifestDigest || !outputFile) {
    fail('USAGE:media-cell-supply-gate.cjs <sbom.json> <scan.json> <sha256:manifest> <gate.json>');
  }
  writeCanonicalJson(outputFile, evaluateSupplyGate({
    sbom: JSON.parse(fs.readFileSync(sbomFile, 'utf8')),
    expectedManifestDigest: manifestDigest,
    scan: JSON.parse(fs.readFileSync(scanFile, 'utf8')),
  }));
}

module.exports = Object.freeze({ evaluateSupplyGate });
