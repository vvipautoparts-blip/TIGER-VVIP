'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const workflowPath = path.join(__dirname, '..', '.github', 'workflows', 'pages.yml');

function workflow() {
  return fs.readFileSync(workflowPath, 'utf8');
}

test('production Pages artifact is built outside the checkout source tree', () => {
  const yaml = workflow();

  assert.match(yaml, /--source\s+["']?\$GITHUB_WORKSPACE["']?/);
  assert.match(yaml, /--output\s+["']?\$RUNNER_TEMP\/vvip-public["']?/);
  assert.doesNotMatch(yaml, /--output\s+["']?dist\/public["']?/);
  assert.match(yaml, /path:\s*["']?\$\{\{\s*runner\.temp\s*\}\}\/vvip-public["']?/);
});
