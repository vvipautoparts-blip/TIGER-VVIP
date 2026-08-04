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

test('isolated quality snapshot excludes Git-ignored local files', () => {
  const gitListLine = qualityGate
    .split('\n')
    .find((line) => line.includes('git ls-files'));

  assert.ok(gitListLine, 'Git-aware snapshot command must exist');

  for (const option of [
    '-z',
    '--cached',
    '--others',
    '--exclude-standard'
  ]) {
    assert.ok(
      gitListLine.includes(option),
      `git ls-files snapshot must include ${option}`
    );
  }

  assert.ok(
    qualityGate.includes(
      'tar --null --verbatim-files-from -T - -cf - |'
    ),
    'tar must consume the NUL-delimited Git file list'
  );

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
