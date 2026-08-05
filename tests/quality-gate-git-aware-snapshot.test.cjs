#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const qualityGate = fs.readFileSync(
  path.join(root, 'scripts/quality-gate.sh'),
  'utf8'
);

test('isolated snapshot mirrors tracked workspace changes and deletions', () => {
  assert.ok(
    qualityGate.includes('if ! git diff --quiet HEAD --; then'),
    'snapshot must detect tracked working-tree changes'
  );

  assert.ok(
    qualityGate.includes('git diff --binary --full-index HEAD -- |'),
    'tracked modifications and deletions must be represented as a binary-safe patch'
  );

  assert.ok(
    qualityGate.includes(
      'git -C "$WORK" apply --whitespace=nowarn -'
    ),
    'tracked workspace changes must be applied to the isolated clone'
  );
});

test('untracked snapshot excludes ignored and local environment files', () => {
  const block = qualityGate.match(
    /git ls-files([\s\S]*?)\|\ntar --null/
  );

  assert.ok(block, 'Git untracked-file snapshot block must exist');

  for (const option of ['-z', '--others', '--exclude-standard']) {
    assert.ok(
      block[1].includes(option),
      `untracked snapshot must include ${option}`
    );
  }

  assert.ok(
    !block[1].includes('--cached'),
    'tracked files must come from the clone and tracked-change patch, not --cached'
  );

  for (const exclusion of [
    "':(exclude).env'",
    "':(exclude).env.*'",
    "':(exclude).venv'",
    "':(exclude).venv/**'"
  ]) {
    assert.ok(
      block[1].includes(exclusion),
      `snapshot must explicitly exclude ${exclusion}`
    );
  }
});

test('snapshot does not archive the complete workspace', () => {
  assert.ok(
    !qualityGate.includes('-cf - . |'),
    'snapshot must not archive the complete workspace'
  );
});

test('temporary Python environment installs pytest with dev requirements', () => {
  const requirementsBranch = qualityGate.match(
    /if \[ -f requirements-dev\.txt \]; then([\s\S]*?)else/
  );

  assert.ok(
    requirementsBranch,
    'temporary Python dependency branch must exist'
  );

  assert.match(
    requirementsBranch[1],
    /-r requirements-dev\.txt[\s\\\n]*pytest/,
    'temporary environment must install pytest with dev requirements'
  );
});
