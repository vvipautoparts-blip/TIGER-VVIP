import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const APP_ID = 'com.vviptiger.app';
const PLATFORMS = new Set(['android', 'ios', 'all']);
const SECRET_MARKERS = [
  'service_role',
  'SUPABASE_SERVICE_ROLE',
  'CLERK_SECRET',
  'sk_live_',
  'sk_test_',
  'BEGIN PRIVATE KEY',
  'BEGIN RSA PRIVATE KEY',
];
const TEXT_EXTENSIONS = new Set(['.html', '.htm', '.js', '.mjs', '.css', '.json', '.webmanifest', '.xml', '.txt']);

function fail(code, detail = '') {
  throw new Error(detail ? `${code}:${detail}` : code);
}

async function walk(root) {
  const output = [];
  async function visit(current) {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) await visit(absolute);
      else if (entry.isFile()) output.push(absolute);
    }
  }
  await visit(root);
  return output;
}

async function scanShippedWeb(wwwDir) {
  for (const file of await walk(wwwDir)) {
    if (!TEXT_EXTENSIONS.has(path.extname(file).toLowerCase())) continue;
    const text = await readFile(file, 'utf8');
    for (const marker of SECRET_MARKERS) {
      if (text.toLowerCase().includes(marker.toLowerCase())) {
        fail('MOBILE_NATIVE_SECRET_MARKER_BLOCKED', `${marker}:${path.relative(wwwDir, file)}`);
      }
    }
  }
}

async function assertAndroid(mobileDir) {
  const manifestPath = path.join(mobileDir, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
  const androidManifest = await readFile(manifestPath, 'utf8');
  if (/android:usesCleartextTraffic\s*=\s*["']true["']/i.test(androidManifest)) {
    fail('MOBILE_NATIVE_ANDROID_CLEARTEXT_BLOCKED');
  }
  if (!/android:usesCleartextTraffic\s*=\s*["']false["']/i.test(androidManifest)) {
    fail('MOBILE_NATIVE_ANDROID_CLEARTEXT_NOT_EXPLICITLY_DISABLED');
  }
}

async function assertIos(mobileDir) {
  const plistPath = path.join(mobileDir, 'ios', 'App', 'App', 'Info.plist');
  const plist = await readFile(plistPath, 'utf8');
  if (/<key>NSAllowsArbitraryLoads<\/key>\s*<true\s*\/>/i.test(plist)) {
    fail('MOBILE_NATIVE_IOS_ATS_FAIL_OPEN_BLOCKED');
  }
}

export async function assertNativeSecurity(mobileDir, platform = 'all') {
  if (!PLATFORMS.has(platform)) fail('MOBILE_NATIVE_PLATFORM_INVALID', platform || 'missing');

  const configPath = path.join(mobileDir, 'capacitor.config.json');
  const config = JSON.parse(await readFile(configPath, 'utf8'));
  if (config.appId !== APP_ID) fail('MOBILE_NATIVE_APP_ID_MISMATCH');
  if (config.webDir !== 'www') fail('MOBILE_NATIVE_WEB_DIR_MISMATCH');

  if (config.server?.url) {
    fail('MOBILE_NATIVE_REMOTE_SERVER_URL_BLOCKED', String(config.server.url));
  }
  if (config.server?.cleartext === true) {
    fail('MOBILE_NATIVE_SERVER_CLEARTEXT_BLOCKED');
  }
  if (Array.isArray(config.server?.allowNavigation) && config.server.allowNavigation.length > 0) {
    fail('MOBILE_NATIVE_NAVIGATION_EXPANSION_BLOCKED', config.server.allowNavigation.join(','));
  }

  const wwwDir = path.join(mobileDir, 'www');
  await scanShippedWeb(wwwDir);

  if (platform === 'android' || platform === 'all') await assertAndroid(mobileDir);
  if (platform === 'ios' || platform === 'all') await assertIos(mobileDir);

  return {
    appId: APP_ID,
    platform,
    cleartext: false,
    remoteServer: false,
    navigationExpansion: false,
  };
}

async function main() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const mobileDir = path.resolve(here, '..');
  const platform = process.argv[2] || 'all';
  const result = await assertNativeSecurity(mobileDir, platform);
  console.log('MOBILE_NATIVE_SECURITY=PASS');
  console.log(`MOBILE_NATIVE_PLATFORM=${result.platform}`);
  console.log(`MOBILE_NATIVE_APP_ID=${result.appId}`);
  console.log('MOBILE_NATIVE_CLEARTEXT=DISABLED');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`MOBILE_NATIVE_SECURITY=BLOCKED\nREASON=${error?.message || error}`);
    process.exitCode = 1;
  });
}
