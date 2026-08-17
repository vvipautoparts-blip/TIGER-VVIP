const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const policyPath = path.join(root, 'config/fusion/runtime-vacuum-policy.json');
const scannerPath = path.join(root, 'scripts/fusion/runtime-vacuum-inventory.cjs');

const EXPECTED_CLASSES = [
  'ACTIVE',
  'MIGRATION_BRIDGE',
  'TEST_ONLY',
  'HISTORICAL_DOC',
  'ORPHANED',
  'DELETE_CANDIDATE'
];

test('F01 runtime vacuum policy and scanner exist', () => {
  assert.equal(fs.existsSync(policyPath), true, 'runtime-vacuum-policy.json must exist');
  assert.equal(fs.existsSync(scannerPath), true, 'runtime-vacuum-inventory.cjs must exist');
});

test('F01 inventory classifies every runtime candidate without deleting by guess', () => {
  const policy = JSON.parse(fs.readFileSync(policyPath, 'utf8'));
  assert.deepEqual(policy.allowedClassifications, EXPECTED_CLASSES);

  const { buildRuntimeInventory } = require(scannerPath);
  const report = buildRuntimeInventory(root, policy);

  assert.ok(report.candidates.length > 0, 'repository must expose runtime candidates');
  assert.deepEqual(report.unclassified, [], `unclassified runtime paths:\n${report.unclassified.join('\n')}`);

  const index = report.candidates.find((entry) => entry.path === 'index.html');
  if (fs.existsSync(path.join(root, 'index.html'))) {
    assert.ok(index, 'index.html must be inventoried');
    assert.equal(index.classification, 'ACTIVE');
  }

  const ownerControl = report.candidates.find((entry) => entry.path === 'owner-control.html');
  if (fs.existsSync(path.join(root, 'owner-control.html'))) {
    assert.ok(ownerControl, 'owner-control.html must be inventoried');
    assert.equal(ownerControl.classification, 'MIGRATION_BRIDGE');
  }

  for (const entry of report.candidates.filter((item) => /pr36/i.test(item.path))) {
    assert.notEqual(entry.classification, 'DELETE_CANDIDATE', `PR36 resource-safety path cannot be auto-deleted: ${entry.path}`);
  }

  for (const entry of report.candidates.filter((item) => item.classification === 'DELETE_CANDIDATE')) {
    assert.equal(entry.requiresEvidence, true, `delete candidate must require evidence: ${entry.path}`);
    assert.ok(entry.reason, `delete candidate must include reason: ${entry.path}`);
  }
});
