'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { validateRealContainerSbom, canonicalJson } = require('./media-cell-sbom.cjs');

const SHA256_PATTERN = /^[0-9a-f]{64}$/;
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

function hasSecretMaterial(value) {
  if (Array.isArray(value)) return value.some(hasSecretMaterial);
  if (value && typeof value === 'object') {
    return Object.entries(value).some(([key, entry]) => SECRET_KEY_PATTERN.test(key) || hasSecretMaterial(entry));
  }
  return typeof value === 'string' && SECRET_VALUE_PATTERNS.some((pattern) => pattern.test(value));
}

function exactKeys(value, allowed, code) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(code);
  const actual = Object.keys(value).sort();
  const expected = [...allowed].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) fail(code);
}

function validCount(value) {
  return Number.isInteger(value) && value >= 0;
}

function validateScan(scan) {
  exactKeys(scan, ['status', 'critical', 'high', 'medium', 'low', 'findingsSha256'], 'SUPPLY_GATE_SCAN_INVALID');
  if (scan.status !== 'COMPLETE') fail('SUPPLY_GATE_SCAN_INCOMPLETE');
  for (const severity of ['critical', 'high', 'medium', 'low']) {
    if (!validCount(scan[severity])) fail('SUPPLY_GATE_SCAN_INVALID');
  }
  if (!SHA256_PATTERN.test(scan.findingsSha256 || '')) fail('SUPPLY_GATE_SCAN_INVALID');
}

function validateMediumException(exception) {
  exactKeys(
    exception,
    ['advisoryId', 'component', 'rationale', 'approvalId', 'expiresAt', 'evidenceSha256'],
    'SUPPLY_GATE_MEDIUM_EXCEPTION_INVALID',
  );
  if (hasSecretMaterial(exception)) fail('SUPPLY_GATE_SECRET_MATERIAL_REJECTED');
  for (const key of ['advisoryId', 'component', 'rationale', 'approvalId']) {
    if (typeof exception[key] !== 'string' || exception[key].trim().length < 3) fail('SUPPLY_GATE_MEDIUM_EXCEPTION_INVALID');
  }
  if (typeof exception.expiresAt !== 'string' || Number.isNaN(Date.parse(exception.expiresAt))) fail('SUPPLY_GATE_MEDIUM_EXCEPTION_INVALID');
  if (!SHA256_PATTERN.test(exception.evidenceSha256 || '')) fail('SUPPLY_GATE_MEDIUM_EXCEPTION_INVALID');
}

function evaluateSupplyGate(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail('SUPPLY_GATE_INPUT_INVALID');
  if (hasSecretMaterial(input)) fail('SUPPLY_GATE_SECRET_MATERIAL_REJECTED');
  const allowed = ['sbom', 'expectedManifestDigest', 'scan', 'mediumException'];
  for (const key of Object.keys(input)) if (!allowed.includes(key)) fail('SUPPLY_GATE_INPUT_UNKNOWN');
  for (const key of ['sbom', 'expectedManifestDigest', 'scan']) if (!Object.hasOwn(input, key)) fail('SUPPLY_GATE_INPUT_INVALID');

  const sbom = validateRealContainerSbom(input.sbom, input.expectedManifestDigest);
  validateScan(input.scan);
  if (input.scan.critical > 0) fail('SUPPLY_GATE_CRITICAL_BLOCK');
  if (input.scan.high > 0) fail('SUPPLY_GATE_HIGH_BLOCK');

  let decision = 'PASS';
  if (input.scan.medium > 0) {
    if (!input.mediumException) fail('SUPPLY_GATE_MEDIUM_REVIEW_REQUIRED');
    validateMediumException(input.mediumException);
    decision = 'PASS_WITH_MEDIUM_EXCEPTION';
  } else if (input.mediumException) {
    validateMediumException(input.mediumException);
  }

  return Object.freeze({
    decision,
    sbomSha256: crypto.createHash('sha256').update(canonicalJson(input.sbom)).digest('hex'),
    subjectDigest: sbom.subjectDigest,
    componentCount: sbom.componentCount,
    findingsSha256: input.scan.findingsSha256,
    counts: Object.freeze({
      critical: input.scan.critical,
      high: input.scan.high,
      medium: input.scan.medium,
      low: input.scan.low,
    }),
  });
}

function writeCanonicalJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${canonicalJson(value)}\n`, { encoding: 'utf8', mode: 0o600 });
}

if (require.main === module) {
  const [sbomFile, scanFile, manifestDigest, outputFile, mediumExceptionFile] = process.argv.slice(2);
  if (!sbomFile || !scanFile || !manifestDigest || !outputFile) {
    fail('USAGE:media-cell-supply-gate.cjs <sbom.json> <scan.json> <sha256:manifest> <gate.json> [medium-exception.json]');
  }
  const input = {
    sbom: JSON.parse(fs.readFileSync(sbomFile, 'utf8')),
    expectedManifestDigest: manifestDigest,
    scan: JSON.parse(fs.readFileSync(scanFile, 'utf8')),
  };
  if (mediumExceptionFile) input.mediumException = JSON.parse(fs.readFileSync(mediumExceptionFile, 'utf8'));
  writeCanonicalJson(outputFile, evaluateSupplyGate(input));
}

module.exports = Object.freeze({ evaluateSupplyGate });
