const test = require('node:test');
const assert = require('node:assert/strict');
const snapshot = require('../config/fusion/production-public-source-manifest.json');

test('F01 public-source snapshot is immutable evidence only', () => {
  assert.equal(snapshot.schemaVersion, 1);
  assert.equal(snapshot.generatedFor, 'FUSION_F01_PRODUCTION_PUBLIC_INPUT_INVENTORY');
  assert.equal(snapshot.mutationAuthorized, false);
  assert.match(snapshot.sourceCommit, /^[0-9a-f]{40}$/);
  assert.match(snapshot.sourceTree, /^[0-9a-f]{40}$/);
  assert.equal(snapshot.builder.path, 'tools/vvip_public_release.py');
  assert.match(snapshot.builder.blobSha, /^[0-9a-f]{40}$/);
});

test('F01 public inputs have unique paths and evidence classifications', () => {
  const paths = snapshot.entries.map((entry) => entry.path);
  assert.equal(new Set(paths).size, paths.length);
  for (const entry of snapshot.entries) {
    assert.ok(entry.classification === 'ACTIVE' || entry.classification === 'REVIEW');
    assert.match(entry.blobSha, /^[0-9a-f]{40}$/);
    assert.ok(Number.isInteger(entry.size) && entry.size >= 0);
    assert.ok(Array.isArray(entry.reasonCodes) && entry.reasonCodes.length > 0);
  }
});

test('F01 keeps large unreferenced logo in review state', () => {
  const item = snapshot.entries.find((entry) => entry.path === 'icons/tiger-logo.png');
  assert.ok(item);
  assert.equal(item.classification, 'REVIEW');
  assert.ok(item.size > 5000000);
});

test('F01 records F02 manifest-copy correction without changing runtime', () => {
  assert.ok(snapshot.findings.some((finding) => finding.code === 'F02_MANIFEST_SECTOR_COPY_UPDATE_REQUIRED'));
  assert.deepEqual(snapshot.generatedOutputs.sort(), ['release-manifest.json', 'runtime-config.js']);
});
