#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');

test('quality gate shell script is syntactically valid', () => {
  const result = spawnSync('bash', ['-n', 'scripts/quality-gate.sh'], {
    cwd: root,
    encoding: 'utf8',
  });

  assert.equal(
    result.status,
    0,
    [result.stderr, result.stdout].filter(Boolean).join('\n') || 'bash -n failed without diagnostic output'
  );
});
