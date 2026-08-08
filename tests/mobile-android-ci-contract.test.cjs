'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const workflowPath = path.join(root, '.github', 'workflows', 'mobile-android-rehearsal.yml');

function workflow() {
  assert.ok(fs.existsSync(workflowPath), 'mobile Android rehearsal workflow must exist');
  return fs.readFileSync(workflowPath, 'utf8');
}

test('Android rehearsal is exact-head, non-production, and uses current Java/Android floors', () => {
  const text = workflow();
  assert.match(text, /runs-on:\s*ubuntu-24\.04/i);
  assert.match(text, /actions\/checkout@v7/);
  assert.match(text, /actions\/setup-node@v6/);
  assert.match(text, /node-version:\s*["']?22["']?/i);
  assert.match(text, /actions\/setup-python@v6/);
  assert.match(text, /python-version:\s*["']?3\.12["']?/i);
  assert.match(text, /actions\/setup-java@v5/);
  assert.match(text, /java-version:\s*["']?21["']?/i);
  assert.match(text, /platforms;android-36/);
  assert.doesNotMatch(text, /environment:\s*(?:production|android-production)/i);
});

test('Android rehearsal builds the exact eligible web artifact before any native generation', () => {
  const text = workflow();
  const build = text.indexOf('tools/vvip_public_release.py');
  const prepare = text.indexOf('prepare-web.mjs');
  const generate = text.indexOf('native:android');
  assert.ok(build >= 0, 'public release builder must run');
  assert.ok(prepare > build, 'verified mobile web preparation must follow public build');
  assert.ok(generate > prepare, 'native Android generation must follow verified web preparation');
  assert.match(text, /--mode\s+candidate/);
  assert.match(text, /--source-sha\s+["']?\$SOURCE_SHA["']?/);
  assert.match(text, /SOURCE_SHA:\s*\$\{\{\s*github\.sha\s*\}\}/);
});

test('Android rehearsal uses the frozen lockfile and platform-scoped security assertion', () => {
  const text = workflow();
  assert.match(text, /npm\s+ci\s+--ignore-scripts\s+--no-audit\s+--no-fund/);
  assert.match(text, /c9a782347f8a4d1dea3015b3ca8c15ce4b2762aff4494eb282820555203d55dd/);
  assert.match(text, /assert-native-security\.mjs\s+android/);
  assert.doesNotMatch(text, /npm\s+install(?!\s+--)/);
});

test('Android rehearsal performs real Gradle verification and emits build evidence', () => {
  const text = workflow();
  for (const task of ['testDebugUnitTest', 'lintDebug', 'assembleDebug']) {
    assert.match(text, new RegExp(`\\./gradlew[^\\n]*${task}`, 'i'), `Gradle task ${task} must run`);
  }
  assert.match(text, /compileSdkVersion[^\n]*36|compileSdk[^\n]*36/i);
  assert.match(text, /targetSdkVersion[^\n]*36|targetSdk[^\n]*36/i);
  assert.match(text, /actions\/upload-artifact@v6/);
  assert.match(text, /mobile-android-debug-\$\{\{\s*github\.sha\s*\}\}/);
});

test('Android rehearsal never references store signing secrets or uploads to Play', () => {
  const text = workflow();
  assert.doesNotMatch(text, /PLAY_SERVICE_ACCOUNT|KEYSTORE|SIGNING_KEY|KEY_PASSWORD|storeFile|publish.*play|google-play|play-console/i);
  assert.doesNotMatch(text, /bundleRelease/);
});
