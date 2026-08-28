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
const REPOSITORY = '211579682376.dkr.ecr.ap-northeast-2.amazonaws.com/tiger-media-finalizer';
const COMPLETED_AT = '2026-08-28T07:00:00.000Z';

function rawSbom(overrides = {}) {
  return {
    bomFormat: 'CycloneDX',
    specVersion: '1.7',
    metadata: {
      component: {
        type: 'container',
        name: 'TIGER-media-finalizer',
      },
      properties: [],
    },
    components: [
      { type: 'library', name: 'sharp', version: '0.35.3' },
      { type: 'operating-system', name: 'Amazon Linux', version: '2023' },
    ],
    ...overrides,
  };
}

function scan(overrides = {}) {
  return {
    status: 'COMPLETE',
    scanMode: 'ENHANCED',
    scanCompletedAt: COMPLETED_AT,
    critical: 0,
    high: 0,
    medium: 0,
    low: 1,
    unknown: 0,
    findingsSha256: H64('b'),
    ...overrides,
  };
}

test('real container SBOM binding adds exact immutable OCI identity', () => {
  assert.equal(fs.existsSync(SBOM), true);
  const { bindRealContainerSbom, validateRealContainerSbom } = require(SBOM);
  const bound = bindRealContainerSbom(rawSbom(), { repository: REPOSITORY, manifestDigest: SUBJECT });
  const properties = Object.fromEntries(bound.metadata.properties.map((entry) => [entry.name, entry.value]));
  assert.equal(properties['tiger:oci_repository'], REPOSITORY);
  assert.equal(properties['tiger:oci_manifest_digest'], SUBJECT);
  assert.equal(properties['tiger:oci_image_uri'], `${REPOSITORY}@${SUBJECT}`);

  const result = validateRealContainerSbom(bound, SUBJECT);
  assert.equal(result.specVersion, '1.7');
  assert.equal(result.subjectDigest, SUBJECT);
  assert.equal(result.componentCount, 2);
  assert.match(result.sha256, /^[0-9a-f]{64}$/);
});

test('real container SBOM validator rejects wrong version, empty inventory, mismatch, and secret-shaped evidence', () => {
  const { bindRealContainerSbom, validateRealContainerSbom } = require(SBOM);
  const bound = bindRealContainerSbom(rawSbom(), { repository: REPOSITORY, manifestDigest: SUBJECT });

  assert.throws(
    () => validateRealContainerSbom({ ...bound, specVersion: '1.6' }, SUBJECT),
    /MEDIA_CELL_SBOM_SPEC_VERSION_INVALID/,
  );
  assert.throws(
    () => validateRealContainerSbom({ ...bound, components: [] }, SUBJECT),
    /MEDIA_CELL_SBOM_COMPONENTS_EMPTY/,
  );
  assert.throws(
    () => validateRealContainerSbom(bound, `sha256:${H64('c')}`),
    /MEDIA_CELL_SBOM_SUBJECT_MISMATCH/,
  );
  const secret = JSON.parse(JSON.stringify(bound));
  secret.metadata.properties.push({ name: 'authorizationHeader', value: 'not-a-token' });
  assert.throws(() => validateRealContainerSbom(secret, SUBJECT), /MEDIA_CELL_SBOM_SECRET_MATERIAL_REJECTED/);
});

test('supply gate accepts completed and continuously ACTIVE enhanced scans only with completed-scan evidence', () => {
  assert.equal(fs.existsSync(GATE), true, 'REQUIRED_FILE_MISSING:scripts/release/media-cell-supply-gate.cjs');
  const { bindRealContainerSbom } = require(SBOM);
  const { evaluateSupplyGate } = require(GATE);
  const sbom = bindRealContainerSbom(rawSbom(), { repository: REPOSITORY, manifestDigest: SUBJECT });

  const completed = evaluateSupplyGate({ sbom, expectedManifestDigest: SUBJECT, scan: scan() });
  assert.equal(completed.decision, 'PASS');
  assert.equal(completed.scanMode, 'ENHANCED');
  assert.equal(completed.componentCount, 2);
  assert.match(completed.sbomSha256, /^[0-9a-f]{64}$/);

  const active = evaluateSupplyGate({ sbom, expectedManifestDigest: SUBJECT, scan: scan({ status: 'ACTIVE' }) });
  assert.equal(active.decision, 'PASS');
  assert.equal(active.scanMode, 'ENHANCED');

  assert.throws(
    () => evaluateSupplyGate({ sbom, expectedManifestDigest: SUBJECT, scan: scan({ status: 'SCANNING' }) }),
    /SUPPLY_GATE_SCAN_INCOMPLETE/,
  );
  assert.throws(
    () => evaluateSupplyGate({ sbom, expectedManifestDigest: SUBJECT, scan: scan({ status: 'ACTIVE', scanCompletedAt: '' }) }),
    /SUPPLY_GATE_SCAN_COMPLETION_EVIDENCE_INVALID/,
  );
  assert.throws(
    () => evaluateSupplyGate({ sbom, expectedManifestDigest: SUBJECT, scan: scan({ scanMode: 'BASIC' }) }),
    /SUPPLY_GATE_SCAN_MODE_INVALID/,
  );
  assert.throws(
    () => evaluateSupplyGate({ sbom, expectedManifestDigest: SUBJECT, scan: scan({ critical: 1 }) }),
    /SUPPLY_GATE_CRITICAL_BLOCK/,
  );
  assert.throws(
    () => evaluateSupplyGate({ sbom, expectedManifestDigest: SUBJECT, scan: scan({ high: 1 }) }),
    /SUPPLY_GATE_HIGH_BLOCK/,
  );
  assert.throws(
    () => evaluateSupplyGate({ sbom, expectedManifestDigest: SUBJECT, scan: scan({ medium: 1 }) }),
    /SUPPLY_GATE_MEDIUM_REVIEW_REQUIRED/,
  );
});

test('supply gate rejects invalid counts, unknown evidence keys, and secret-shaped scan evidence', () => {
  const { bindRealContainerSbom } = require(SBOM);
  const { evaluateSupplyGate } = require(GATE);
  const sbom = bindRealContainerSbom(rawSbom(), { repository: REPOSITORY, manifestDigest: SUBJECT });

  assert.throws(
    () => evaluateSupplyGate({ sbom, expectedManifestDigest: SUBJECT, scan: scan({ high: -1 }) }),
    /SUPPLY_GATE_SCAN_INVALID/,
  );
  const unknown = scan();
  unknown.extra = true;
  assert.throws(
    () => evaluateSupplyGate({ sbom, expectedManifestDigest: SUBJECT, scan: unknown }),
    /SUPPLY_GATE_SCAN_UNKNOWN/,
  );
  const secret = scan();
  secret.authorizationHeader = 'not-a-token';
  assert.throws(
    () => evaluateSupplyGate({ sbom, expectedManifestDigest: SUBJECT, scan: secret }),
    /SUPPLY_GATE_SECRET_MATERIAL_REJECTED|SUPPLY_GATE_SCAN_UNKNOWN/,
  );
});
