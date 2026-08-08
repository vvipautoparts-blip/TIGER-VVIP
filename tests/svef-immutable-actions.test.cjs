'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.join(__dirname, '..');
const PROTECTED = [
  '.github/workflows/vvip-quality-gate.yml',
  '.github/workflows/codeql.yml',
  '.github/workflows/dependency-review.yml',
  '.github/workflows/tiger-cleanguard.yml',
  '.github/workflows/project-control-integrity.yml',
  '.github/workflows/v14-release-candidate.yml',
  '.github/workflows/pages.yml',
  '.github/workflows/lc03-supabase-security-rehearsal.yml',
  '.github/workflows/tsrf-semantic-convergence.yml',
  '.github/workflows/tsrf-phone-otp-rehearsal.yml',
  '.github/workflows/tsrf-staging-evidence.yml',
];

const IMMUTABLE_ACTION = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.\/-]+@[0-9a-f]{40}$/;

function workflow(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function externalUses(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.match(/^\s*-?\s*uses:\s*([^\s#]+)(?:\s+#.*)?$/)?.[1] || null)
    .filter(Boolean)
    .filter((value) => !value.startsWith('./'));
}

test('all protected workflows use immutable full-SHA action references', () => {
  const failures = [];
  for (const relativePath of PROTECTED) {
    const text = workflow(relativePath);
    for (const action of externalUses(text)) {
      if (!IMMUTABLE_ACTION.test(action)) failures.push(`${relativePath}: ${action}`);
    }
  }
  assert.deepEqual(failures, [], `mutable action references:\n${failures.join('\n')}`);
});

test('protected workflows contain no uncontrolled pip self-upgrade', () => {
  const failures = [];
  for (const relativePath of PROTECTED) {
    const text = workflow(relativePath);
    if (/python\s+-m\s+pip\s+install\s+--upgrade\s+pip/i.test(text)) failures.push(relativePath);
  }
  assert.deepEqual(failures, [], `uncontrolled pip upgrade in:\n${failures.join('\n')}`);
});

test('protected workflow inventory exists and remains explicit', () => {
  for (const relativePath of PROTECTED) {
    const absolute = path.join(ROOT, relativePath);
    assert.equal(fs.existsSync(absolute), true, `missing protected workflow ${relativePath}`);
  }
  assert.equal(new Set(PROTECTED).size, PROTECTED.length);
});
