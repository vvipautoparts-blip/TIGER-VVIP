import { access, rm } from 'node:fs/promises';
import { constants } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { patchAndroid } from './patch-android.mjs';
import { patchIos } from './patch-ios.mjs';

const PLATFORMS = new Set(['android', 'ios']);
const CAP_ADD_COMMAND = Object.freeze(['cap', 'add']);

function fail(code, detail = '') {
  throw new Error(detail ? `${code}:${detail}` : code);
}

async function main() {
  const platform = process.argv[2] || '';
  if (!PLATFORMS.has(platform)) fail('MOBILE_NATIVE_PLATFORM_INVALID', platform || 'missing');

  const here = path.dirname(fileURLToPath(import.meta.url));
  const mobileDir = path.resolve(here, '..');
  const wwwManifest = path.join(mobileDir, 'www', 'release-manifest.json');
  const platformDir = path.join(mobileDir, platform);
  const capBin = path.join(mobileDir, 'node_modules', '.bin', process.platform === 'win32' ? 'cap.cmd' : 'cap');

  await access(wwwManifest, constants.R_OK).catch(() => fail('MOBILE_NATIVE_VERIFIED_WEB_MISSING'));
  await access(capBin, constants.X_OK).catch(() => fail('MOBILE_NATIVE_LOCAL_CAPACITOR_MISSING'));

  await rm(platformDir, { recursive: true, force: true });

  const result = spawnSync(capBin, ['add', platform], {
    cwd: mobileDir,
    stdio: 'inherit',
    env: process.env,
  });
  if (result.error) fail('MOBILE_NATIVE_CAP_ADD_ERROR', result.error.message);
  if (result.status !== 0) fail('MOBILE_NATIVE_CAP_ADD_FAILED', String(result.status));

  if (platform === 'android') {
    await patchAndroid(mobileDir);
  } else {
    await patchIos(mobileDir);
  }

  console.log(`MOBILE_NATIVE_GENERATOR=PASS:${platform}`);
  console.log(`MOBILE_NATIVE_COMMAND=${CAP_ADD_COMMAND.join(' ')} ${platform}`);
}

main().catch((error) => {
  console.error(`MOBILE_NATIVE_GENERATOR=BLOCKED\nREASON=${error?.message || error}`);
  process.exitCode = 1;
});
