'use strict';

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

test('obsolete P01 gap matrix cannot remain as current-tree execution guidance', () => {
  const relative = 'docs/owner-control/VVIP_TIGER_IMPLEMENTATION_GAP_MATRIX.md';
  assert.equal(fs.existsSync(path.join(root, relative)), false);
  const manifest = read('docs/owner-control/DELETION_MANIFEST_CURRENT.md');
  assert.match(manifest, /VVIP_TIGER_IMPLEMENTATION_GAP_MATRIX\.md/);
});

test('P17 remains historical evidence only and cannot authorize current subscriptions', () => {
  const p17 = read('docs/owner-control/P17_TRIAL_SUBSCRIPTIONS_AND_ENTITLEMENTS.md');
  assert.match(p17, /HISTORICAL_PHASE_EVIDENCE/);
  assert.match(p17, /NON-AUTHORITY/);
  assert.match(p17, /TIGER_OWNER_BINDING_CURRENT\.md/);
  assert.match(p17, /ordinary eligible sector publication remains free/i);
  assert.match(p17, /does not authorize/i);
});

test('execution charter is subordinate to current binding and exact-head pre-merge verification', () => {
  const charter = read('docs/owner-control/VVIP_TIGER_EXECUTION_CHARTER.md');
  assert.match(charter, /TIGER_OWNER_BINDING_CURRENT\.md/);
  assert.match(charter, /PR #349/);
  assert.match(charter, /exact-head/i);
  assert.match(charter, /runner-executed GREEN/i);
  assert.match(charter, /Draft/i);
  assert.doesNotMatch(charter, /لا علامة ✅ قبل التحقق بعد الدمج/);
});
