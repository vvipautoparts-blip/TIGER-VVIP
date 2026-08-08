'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const mobile = path.join(root, 'mobile');

function read(relative) {
  const absolute = path.join(root, relative);
  assert.ok(fs.existsSync(absolute), `${relative} must exist`);
  return fs.readFileSync(absolute, 'utf8');
}

function json(relative) {
  return JSON.parse(read(relative));
}

test('mobile workspace pins the reviewed Capacitor release exactly', () => {
  const pkg = json('mobile/package.json');
  assert.equal(pkg.private, true);
  assert.equal(pkg.engines.node, '>=22');
  assert.deepEqual(pkg.dependencies, {
    '@capacitor/android': '8.4.2',
    '@capacitor/core': '8.4.2',
    '@capacitor/ios': '8.4.2',
  });
  assert.deepEqual(pkg.devDependencies, { '@capacitor/cli': '8.4.2' });
});

test('Capacitor identity and web directory are launch-stable', () => {
  const config = json('mobile/capacitor.config.json');
  assert.equal(config.appId, 'com.vviptiger.app');
  assert.equal(config.appName, 'VVIP TIGER');
  assert.equal(config.webDir, 'www');
  assert.equal(config.bundledWebRuntime, false);
});

test('prepare-web is release-manifest and exact-SHA bound', () => {
  const text = read('mobile/scripts/prepare-web.mjs');
  assert.match(text, /release-manifest\.json/);
  assert.match(text, /releaseEligible/);
  assert.match(text, /SOURCE_SHA/);
  assert.match(text, /sourceSha/);
  assert.match(text, /rm\([^\n]*www|rmSync\([^\n]*www|fs\.rm\([^\n]*www/s);
  assert.doesNotMatch(text, /copyFile[^\n]*\.\.[/\\]\.\.|cp[^\n]*repository root/i);
});

test('mobile artifact boundary hard-blocks server secret material', () => {
  const text = read('mobile/scripts/assert-mobile-boundary.mjs');
  for (const marker of [
    'service_role',
    'SUPABASE_SERVICE_ROLE',
    'CLERK_SECRET',
    'BEGIN PRIVATE KEY',
    'BEGIN RSA PRIVATE KEY',
  ]) {
    assert.ok(text.includes(marker), `boundary scanner must reject ${marker}`);
  }
  assert.match(text, /releaseEligible/);
  assert.match(text, /sourceSha/);
});

test('mobile source workspace never tracks generated www or native project output', () => {
  const ignore = read('.gitignore');
  for (const entry of ['mobile/www/', 'mobile/android/', 'mobile/ios/', 'mobile/node_modules/']) {
    assert.ok(ignore.includes(entry), `.gitignore must contain ${entry}`);
  }
  assert.ok(!fs.existsSync(path.join(mobile, 'www')), 'mobile/www must be generated, not committed');
  assert.ok(!fs.existsSync(path.join(mobile, 'android')), 'mobile/android must be generated, not committed');
  assert.ok(!fs.existsSync(path.join(mobile, 'ios')), 'mobile/ios must be generated, not committed');
});
