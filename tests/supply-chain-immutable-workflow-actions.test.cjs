'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const WORKFLOW_DIR = path.join(__dirname, '..', '.github', 'workflows');
const IMMUTABLE_GITHUB_ACTION = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.\/-]+@[0-9a-f]{40}$/;
const REQUIRED_UPLOAD_ARTIFACT_REF = 'actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a';
const REQUIRED_UPLOAD_ARTIFACT_VERSION = 'v7.0.1';

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
  let uploadArtifactCount = 0;

  for (const file of files) {
    const relativePath = `.github/workflows/${file}`;
    const text = fs.readFileSync(path.join(WORKFLOW_DIR, file), 'utf8');
    const lines = text.split(/\r?\n/);

    for (const action of externalUses(text)) {
      externalActionCount += 1;
      if (!IMMUTABLE_GITHUB_ACTION.test(action)) {
        failures.push(`${relativePath}: ${action}`);
      }
    }

    lines.forEach((line, index) => {
      const match = line.match(/^\s*-?\s*uses:\s*([^\s#]+)(?:\s+#\s*(v[^\s]+))?\s*$/);
      if (!match || !match[1].startsWith('actions/upload-artifact@')) return;

      uploadArtifactCount += 1;
      const action = match[1];
      const versionComment = match[2] || null;
      if (action !== REQUIRED_UPLOAD_ARTIFACT_REF || versionComment !== REQUIRED_UPLOAD_ARTIFACT_VERSION) {
        failures.push(
          `${relativePath}:${index + 1}: actions/upload-artifact must be ${REQUIRED_UPLOAD_ARTIFACT_REF} # ${REQUIRED_UPLOAD_ARTIFACT_VERSION}; got ${line.trim()}`,
        );
      }
    });
  }

  assert.ok(externalActionCount > 0, 'expected at least one external workflow action');
  assert.ok(uploadArtifactCount > 0, 'expected at least one actions/upload-artifact workflow use');
  assert.deepEqual(
    failures,
    [],
    `workflow action policy violations:\n${failures.join('\n')}`,
  );
});
