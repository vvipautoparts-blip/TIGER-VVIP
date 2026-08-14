'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const workflow = fs.readFileSync(
  path.join(__dirname, '..', '.github', 'workflows', 'release-candidate.yml'),
  'utf8',
);

test('release candidate builds outside the checked-out source tree', () => {
  assert.match(workflow, /uses:\s*actions\/checkout@b4ffde65f46336ab88eb53be808477a3936bae11/);
  assert.match(workflow, /--source\s+\.\s*\\/);
  assert.match(workflow, /--output\s+"\$RUNNER_TEMP\/vvip-candidate"\s*\\/);
  assert.doesNotMatch(workflow, /--output\s+dist\/candidate/);
});

test('release candidate uploads the exact external build directory', () => {
  assert.match(workflow, /path:\s*\$\{\{\s*runner\.temp\s*\}\}\/vvip-candidate/);
  assert.doesNotMatch(workflow, /path:\s*dist\/candidate/);
});

test('release candidate binds pull requests to the exact source head SHA', () => {
  assert.match(
    workflow,
    /SOURCE_SHA:\s*\$\{\{\s*github\.event_name\s*==\s*'pull_request'\s*&&\s*github\.event\.pull_request\.head\.sha\s*\|\|\s*github\.sha\s*\}\}/,
  );
  assert.match(workflow, /ref:\s*\$\{\{\s*env\.SOURCE_SHA\s*\}\}/);
  assert.match(workflow, /git\s+rev-parse\s+HEAD/);
  assert.match(workflow, /test\s+"\$actual_sha"\s*=\s*"\$SOURCE_SHA"/);
  assert.match(workflow, /--source-sha\s+"\$SOURCE_SHA"/);
  assert.match(workflow, /name:\s*release-candidate-\$\{\{\s*env\.SOURCE_SHA\s*\}\}/);
  assert.doesNotMatch(workflow, /--source-sha\s+"\$GITHUB_SHA"/);
});

test('release candidate has no historical integration branch trigger', () => {
  assert.match(workflow, /pull_request:[\s\S]*?branches:[\s\S]*?- main/);
  assert.match(workflow, /push:[\s\S]*?branches:[\s\S]*?- main/);
  assert.doesNotMatch(workflow, /integration\/v14|feat\/|release\/tiger/i);
});
