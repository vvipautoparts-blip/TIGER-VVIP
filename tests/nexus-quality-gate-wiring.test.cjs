'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const assert = require('node:assert/strict');
const test = require('node:test');

test('root quality-gate suite executes every nested NEXUS contract', () => {
  const nexusDir = path.resolve('tests/nexus');
  const files = fs.readdirSync(nexusDir)
    .filter((name) => name.endsWith('.test.cjs'))
    .sort()
    .map((name) => path.join('tests/nexus', name));

  assert.ok(files.length > 0, 'NEXUS contract suite must not be empty');
  const nestedEnv = Object.fromEntries(
    Object.entries({ ...process.env, TIGER_NEXUS_NESTED_GATE: '1' })
      .filter(([key]) => key !== 'NODE_TEST_CONTEXT')
  );
  const result = spawnSync(process.execPath, ['--test', ...files], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: nestedEnv,
  });

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  assert.equal(result.status, 0, 'nested NEXUS contracts must pass');
});
