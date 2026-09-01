'use strict';

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const files = [
  'docs/owner-control/VVIP_TIGER_P01_PRIORITY_FINDINGS.md',
  'docs/owner-control/VVIP_TIGER_P01_REPOSITORY_AUDIT_COMPLETION.md',
  'docs/owner-control/VVIP_TIGER_REPOSITORY_AUDIT_REPORT.md',
  'docs/owner-control/VVIP_TIGER_P07_P34_TRUTH_AUDIT.md'
];

test('historical audit records are explicitly non-authoritative and route to current binding', () => {
  for (const relative of files) {
    const source = fs.readFileSync(path.join(root, relative), 'utf8');
    assert.match(source, /HISTORICAL.*EVIDENCE/i, `${relative} must be historical evidence`);
    assert.match(source, /NON-AUTHORITY/i, `${relative} must be non-authority`);
    assert.match(source, /TIGER_OWNER_BINDING_CURRENT\.md/, `${relative} must route to current binding`);
  }
});

test('historical audit records cannot direct the current P02 or old phase-control lane', () => {
  const combined = files.map((relative) => fs.readFileSync(path.join(root, relative), 'utf8')).join('\n');
  assert.doesNotMatch(combined, /What Blocks Transition To P02/i);
  assert.doesNotMatch(combined, /Recommended Execution Order/i);
  assert.doesNotMatch(combined, /Current phase after closure:\s*P02/i);
  assert.doesNotMatch(combined, /P07\s*=\s*planning\s*\/\s*next_authorized/i);
  assert.match(combined, /PR #349/);
});
