'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const workflowPath = path.join(__dirname, '..', '.github', 'workflows', 'lc06-rls-performance-hardening-rehearsal.yml');
const UPLOAD_ARTIFACT_V7_0_1_SHA = '043fb46d1a93c77aae656e7c1c64a875d1fc6a0a';
const LEGACY_UPLOAD_ARTIFACT_SHA = 'b7c566a772e6b6bfb58ed0dc250532a479d7789f';

function workflow() {
  return fs.readFileSync(workflowPath, 'utf8');
}

test('LC06 pins upload-artifact v7.0.1 while preserving bounded digest upload', () => {
  const text = workflow();

  assert.match(
    text,
    new RegExp(`actions/upload-artifact@${UPLOAD_ARTIFACT_V7_0_1_SHA}`),
    'LC06 must pin the latest stable upload-artifact release by immutable SHA'
  );
  assert.doesNotMatch(text, new RegExp(`actions/upload-artifact@${LEGACY_UPLOAD_ARTIFACT_SHA}`));

  const uploadBlock = text.match(/- name: Upload LC06 migration digest[\s\S]*?(?=\n\s*- (?:name:|uses:)|$)/)?.[0] ?? '';
  assert.match(uploadBlock, /name:\s*lc06-migration-sha256-\$\{\{ env\.SOURCE_SHA \}\}/);
  assert.match(uploadBlock, /path:\s*\$\{\{ runner\.temp \}\}\/lc06-digest\/migration\.sha256/);
  assert.match(uploadBlock, /if-no-files-found:\s*error/);
  assert.match(uploadBlock, /retention-days:\s*14/);
  assert.match(text, /permissions:\s*\n\s*contents:\s*read/);
});
