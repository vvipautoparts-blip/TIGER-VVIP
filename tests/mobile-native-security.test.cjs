'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { pathToFileURL } = require('node:url');

const root = path.join(__dirname, '..');

async function loadSecurity() {
  const modulePath = path.join(root, 'mobile', 'scripts', 'assert-native-security.mjs');
  return import(`${pathToFileURL(modulePath).href}?t=${Date.now()}`);
}

async function fixture() {
  const mobileDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vvip-mobile-security-'));
  await fs.mkdir(path.join(mobileDir, 'www'), { recursive: true });
  await fs.mkdir(path.join(mobileDir, 'android', 'app', 'src', 'main'), { recursive: true });
  await fs.mkdir(path.join(mobileDir, 'ios', 'App', 'App'), { recursive: true });
  await fs.writeFile(
    path.join(mobileDir, 'capacitor.config.json'),
    JSON.stringify({ appId: 'com.vviptiger.app', appName: 'VVIP TIGER', webDir: 'www' }),
  );
  await fs.writeFile(path.join(mobileDir, 'www', 'index.html'), '<!doctype html><title>VVIP TIGER</title>');
  await fs.writeFile(
    path.join(mobileDir, 'android', 'app', 'src', 'main', 'AndroidManifest.xml'),
    '<manifest xmlns:android="http://schemas.android.com/apk/res/android"><application android:usesCleartextTraffic="false" /></manifest>',
  );
  await fs.writeFile(
    path.join(mobileDir, 'ios', 'App', 'App', 'Info.plist'),
    '<?xml version="1.0"?><plist><dict><key>CFBundleDisplayName</key><string>VVIP TIGER</string></dict></plist>',
  );
  return mobileDir;
}

async function expectBlocked(mobileDir, pattern) {
  const { assertNativeSecurity } = await loadSecurity();
  await assert.rejects(() => assertNativeSecurity(mobileDir), pattern);
}

test('safe generated native shell passes fail-closed security assertions', async (t) => {
  const mobileDir = await fixture();
  t.after(() => fs.rm(mobileDir, { recursive: true, force: true }));
  const { assertNativeSecurity } = await loadSecurity();
  const result = await assertNativeSecurity(mobileDir);
  assert.equal(result.appId, 'com.vviptiger.app');
  assert.equal(result.cleartext, false);
});

test('remote WebView URL and navigation allowlist expansion are blocked', async (t) => {
  const mobileDir = await fixture();
  t.after(() => fs.rm(mobileDir, { recursive: true, force: true }));
  const configPath = path.join(mobileDir, 'capacitor.config.json');

  await fs.writeFile(configPath, JSON.stringify({
    appId: 'com.vviptiger.app', appName: 'VVIP TIGER', webDir: 'www', server: { url: 'http://dev.example.test' },
  }));
  await expectBlocked(mobileDir, /MOBILE_NATIVE_REMOTE_SERVER_URL_BLOCKED/);

  await fs.writeFile(configPath, JSON.stringify({
    appId: 'com.vviptiger.app', appName: 'VVIP TIGER', webDir: 'www', server: { allowNavigation: ['*'] },
  }));
  await expectBlocked(mobileDir, /MOBILE_NATIVE_NAVIGATION_EXPANSION_BLOCKED/);
});

test('server secrets in shipped web bytes are blocked', async (t) => {
  const mobileDir = await fixture();
  t.after(() => fs.rm(mobileDir, { recursive: true, force: true }));
  const html = path.join(mobileDir, 'www', 'index.html');

  for (const marker of ['service_role', 'SUPABASE_SERVICE_ROLE', 'CLERK_SECRET', 'sk_live_', 'sk_test_', 'BEGIN PRIVATE KEY']) {
    await fs.writeFile(html, `<script>const leaked='${marker}EXAMPLE';</script>`);
    await expectBlocked(mobileDir, /MOBILE_NATIVE_SECRET_MARKER_BLOCKED/);
  }
});

test('Android cleartext and iOS arbitrary ATS loads are blocked', async (t) => {
  const mobileDir = await fixture();
  t.after(() => fs.rm(mobileDir, { recursive: true, force: true }));

  const manifest = path.join(mobileDir, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
  await fs.writeFile(manifest, '<manifest><application android:usesCleartextTraffic="true" /></manifest>');
  await expectBlocked(mobileDir, /MOBILE_NATIVE_ANDROID_CLEARTEXT_BLOCKED/);

  await fs.writeFile(manifest, '<manifest><application android:usesCleartextTraffic="false" /></manifest>');
  const plist = path.join(mobileDir, 'ios', 'App', 'App', 'Info.plist');
  await fs.writeFile(plist, '<plist><dict><key>NSAllowsArbitraryLoads</key><true/></dict></plist>');
  await expectBlocked(mobileDir, /MOBILE_NATIVE_IOS_ATS_FAIL_OPEN_BLOCKED/);
});
