#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const qualityGatePath = path.join(root, 'scripts', 'quality-gate.sh');

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

test('diff check executes through the isolated clean gate', () => {
  const source = fs.readFileSync(qualityGatePath, 'utf8');

  assert.match(source, /run_diff_check\(\)\s*\{/);
  assert.match(source, /VVIP_CI_FETCH_BASE_IN_ISOLATED_WORKSPACE/);
  assert.match(source, /git diff --check origin\/main\.\.\.HEAD/);
  assert.match(source, /run_clean_gate\s+["']diff_check["']\s+run_diff_check/);
});
