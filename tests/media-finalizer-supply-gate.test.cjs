'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const GATE = path.join(ROOT, 'scripts', 'release', 'media-cell-supply-gate.cjs');
const SBOM = path.join(ROOT, 'scripts', 'release', 'media-cell-sbom.cjs');
const H64 = (char) => char.repeat(64);
const SUBJECT = `sha256:${H64('a')}`;

function realSbom(overrides = {}) {
  return {
    bomFormat: 'CycloneDX',
    specVersion: '1.7',
    metadata: {
      component: {
        type: 'container',
        name: 'TIGER-media-finalizer',
        version: SUBJECT,
      },
      properties: [
        { name: 'tiger:oci_manifest_digest', value: SUBJECT },
      ],
    },
    components: [
      { type: 'library', name: 'sharp', version: '0.34.3' },
      { type: 'operating-system', name: 'Amazon Linux', version: '2023' },
    ],
    ...overrides,
  };
}

function scan(overrides = {}) {
  return {
    status: 'COMPLETE',
    critical: 0,
    high: 0,
    medium: 0,
    low: 1,
    findingsSha256: H64('b'),
    ...overrides,
  };
}

test('real container SBOM must be CycloneDX 1.7 and bound to exact OCI digest', () => {
  assert.equal(fs.existsSync(SBOM), true);
  const { validateRealContainerSbom } = require(SBOM);
  const result = validateRealContainerSbom(realSbom(), SUBJECT);
  assert.equal(result.specVersion, '1.7');
  assert.equal(result.subjectDigest, SUBJECT);
  assert.equal(result.componentCount, 2);

  assert.throws(() => validateRealContainerSbom(realSbom({ specVersion: '1.6' }), SUBJECT), /MEDIA_CELL_SBOM_SPEC_VERSION_INVALID/);
  assert.throws(() => validateRealContainerSbom(realSbom({ components: [] }), SUBJECT), /MEDIA_CELL_SBOM_COMPONENTS_EMPTY/);
  assert.throws(() => validateRealContainerSbom(realSbom(), `sha256:${H64('c')}`), /MEDIA_CELL_SBOM_SUBJECT_MISMATCH/);
});

test('supply gate blocks Critical and High findings and fails closed on unknown scan state', () => {
  assert.equal(fs.existsSync(GATE), true, 'REQUIRED_FILE_MISSING:scripts/release/media-cell-supply-gate.cjs');
  const { evaluateSupplyGate } = require(GATE);
  const sbom = realSbom();
  assert.equal(evaluateSupplyGate({ sbom, expectedManifestDigest: SUBJECT, scan: scan() }).decision, 'PASS');
  assert.throws(() => evaluateSupplyGate({ sbom, expectedManifestDigest: SUBJECT, scan: scan({ critical: 1 }) }), /SUPPLY_GATE_CRITICAL_BLOCK/);
  assert.throws(() => evaluateSupplyGate({ sbom, expectedManifestDigest: SUBJECT, scan: scan({ high: 1 }) }), /SUPPLY_GATE_HIGH_BLOCK/);
  assert.throws(() => evaluateSupplyGate({ sbom, expectedManifestDigest: SUBJECT, scan: scan({ status: 'SCANNING' }) }), /SUPPLY_GATE_SCAN_INCOMPLETE/);
});

test('Medium findings require explicit bounded exception evidence', () => {
  const { evaluateSupplyGate } = require(GATE);
  const input = { sbom: realSbom(), expectedManifestDigest: SUBJECT, scan: scan({ medium: 1 }) };
  assert.throws(() => evaluateSupplyGate(input), /SUPPLY_GATE_MEDIUM_REVIEW_REQUIRED/);
  const accepted = evaluateSupplyGate({
    ...input,
    mediumException: {
      advisoryId: 'CVE-2026-12345',
      component: 'example@1.0.0',
      rationale: 'not reachable in Media Finalizer runtime path',
      approvalId: 'OWNER-SECURITY-2026-08-28-01',
      expiresAt: '2026-09-28T00:00:00Z',
      evidenceSha256: H64('d'),
    },
  });
  assert.equal(accepted.decision, 'PASS_WITH_MEDIUM_EXCEPTION');
});
