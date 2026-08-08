'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');

function read(relative) {
  const absolute = path.join(root, relative);
  assert.ok(fs.existsSync(absolute), `${relative} must exist`);
  return fs.readFileSync(absolute, 'utf8');
}

test('native generator is local-cli-only, clean, and platform allowlisted', () => {
  const text = read('mobile/scripts/generate-native.mjs');
  assert.match(text, /['"]node_modules['"]/);
  assert.match(text, /['"]\.bin['"]/);
  assert.match(text, /['"]cap(?:\.cmd)?['"]/);
  assert.doesNotMatch(text, /\bnpx\s+cap\b|exec\([^)]*npx/i);
  assert.match(text, /release-manifest\.json/);
  assert.match(text, /const\s+platformDir\s*=/);
  assert.match(text, /rm\(platformDir,\s*\{\s*recursive:\s*true,\s*force:\s*true\s*\}\)/);
  assert.match(text, /new Set\(\[['"]android['"],\s*['"]ios['"]\]\)/);
  assert.match(text, /spawnSync\(capBin,\s*\[['"]add['"],\s*platform\]/);
});

test('Android patch enforces API 36 and rejects insecure transport', () => {
  const text = read('mobile/scripts/patch-android.mjs');
  assert.match(text, /const\s+REQUIRED_SDK\s*=\s*36\s*;/);
  assert.match(text, /compileSdkVersion/);
  assert.match(text, /targetSdkVersion/);
  assert.match(text, /com\.vviptiger\.app/);
  assert.match(text, /usesCleartextTraffic/);
  assert.match(text, /MOBILE_ANDROID_PATCH=PASS/);
});

test('iOS patch enforces launch identity and fail-closed ATS', () => {
  const text = read('mobile/scripts/patch-ios.mjs');
  assert.match(text, /com\.vviptiger\.app/);
  assert.match(text, /VVIP TIGER/);
  assert.match(text, /NSAllowsArbitraryLoads/);
  assert.match(text, /MOBILE_IOS_PATCH=PASS/);
});

test('mobile package exposes deterministic platform generation commands only', () => {
  const pkg = JSON.parse(read('mobile/package.json'));
  assert.equal(pkg.scripts['native:android'], 'node scripts/generate-native.mjs android');
  assert.equal(pkg.scripts['native:ios'], 'node scripts/generate-native.mjs ios');
});
