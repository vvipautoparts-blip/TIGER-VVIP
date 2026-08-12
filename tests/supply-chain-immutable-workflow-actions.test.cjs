'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const WORKFLOW_DIR = path.join(__dirname, '..', '.github', 'workflows');
const IMMUTABLE_GITHUB_ACTION = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.\/-]+@[0-9a-f]{40}$/;

function workflowFiles() {
  return fs.readdirSync(WORKFLOW_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.ya?ml$/i.test(entry.name))
    .map((entry) => entry.name)
    .sort();
}

function externalUses(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.match(/^\s*-?\s*uses:\s*([^\s#]+)(?:\s+#.*)?$/)?.[1] || null)
    .filter(Boolean)
    .filter((value) => !value.startsWith('./'));
}

test('every current workflow pins every external GitHub Action to an immutable full commit SHA', () => {
  const files = workflowFiles();
  assert.ok(files.length > 0, 'workflow inventory must not be empty');

  const failures = [];
  let externalActionCount = 0;

  for (const file of files) {
    const relativePath = `.github/workflows/${file}`;
    const text = fs.readFileSync(path.join(WORKFLOW_DIR, file), 'utf8');
    for (const action of externalUses(text)) {
      externalActionCount += 1;
      if (!IMMUTABLE_GITHUB_ACTION.test(action)) {
        failures.push(`${relativePath}: ${action}`);
      }
    }
  }

  assert.ok(externalActionCount > 0, 'expected at least one external workflow action');
  assert.deepEqual(
    failures,
    [],
    `mutable external workflow action references:\n${failures.join('\n')}`,
  );
});
