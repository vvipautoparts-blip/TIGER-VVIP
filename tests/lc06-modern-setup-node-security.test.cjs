'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const workflowPath = path.join(__dirname, '..', '.github', 'workflows', 'lc06-rls-performance-hardening-rehearsal.yml');
const SETUP_NODE_V7_SHA = '820762786026740c76f36085b0efc47a31fe5020';
const LEGACY_SETUP_NODE_SHA = '249970729cb0ef3589644e2896645e5dc5ba9c38';

function workflow() {
  return fs.readFileSync(workflowPath, 'utf8');
}

test('LC06 pins setup-node v7 and disables automatic package-manager caching', () => {
  const text = workflow();

  assert.match(
    text,
    new RegExp(`actions/setup-node@${SETUP_NODE_V7_SHA}`),
    'LC06 must pin the latest stable setup-node v7 release by immutable SHA'
  );
  assert.doesNotMatch(text, new RegExp(`actions/setup-node@${LEGACY_SETUP_NODE_SHA}`));

  const setupNodeBlock = text.match(/- uses: actions\/setup-node@[^\n]+[\s\S]*?(?=\n\s*- (?:name:|uses:)|$)/)?.[0] ?? '';
  assert.match(setupNodeBlock, /node-version:\s*["']?22["']?/);
  assert.match(setupNodeBlock, /package-manager-cache:\s*false/);
  assert.match(text, /permissions:\s*\n\s*contents:\s*read/);
});
