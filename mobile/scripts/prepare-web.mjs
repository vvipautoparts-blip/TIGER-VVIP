import { cp, mkdir, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertMobileBoundary } from './assert-mobile-boundary.mjs';

function fail(code, detail = '') {
  const suffix = detail ? `:${detail}` : '';
  throw new Error(`${code}${suffix}`);
}

function safeRelative(relative) {
  const value = String(relative || '').replaceAll('\\', '/');
  if (!value || value.startsWith('/') || value.split('/').includes('..')) {
    fail('MOBILE_UNSAFE_PUBLIC_PATH', value);
  }
  return value;
}

async function main() {
  const SOURCE_SHA = process.env.SOURCE_SHA || '';
  if (!/^[0-9a-f]{40}$/i.test(SOURCE_SHA)) fail('MOBILE_SOURCE_SHA_REQUIRED');

  const here = path.dirname(fileURLToPath(import.meta.url));
  const mobileDir = path.resolve(here, '..');
  const repoRoot = path.resolve(mobileDir, '..');
  const publicDir = path.join(repoRoot, 'dist', 'public');
  const wwwDir = path.join(mobileDir, 'www');
  const manifestPath = path.join(publicDir, 'release-manifest.json');

  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  if (manifest.releaseEligible !== true) fail('MOBILE_SOURCE_RELEASE_NOT_ELIGIBLE');
  if (manifest.sourceSha !== SOURCE_SHA) {
    fail('MOBILE_SOURCE_SHA_MISMATCH', `${manifest.sourceSha || 'missing'}!=${SOURCE_SHA}`);
  }
  if (!manifest.files || typeof manifest.files !== 'object' || Array.isArray(manifest.files)) {
    fail('MOBILE_SOURCE_MANIFEST_FILES_INVALID');
  }

  await rm(wwwDir, { recursive: true, force: true });
  await mkdir(wwwDir, { recursive: true });

  for (const relativeRaw of Object.keys(manifest.files).sort()) {
    const relative = safeRelative(relativeRaw);
    const source = path.resolve(publicDir, relative);
    const destination = path.resolve(wwwDir, relative);
    if (!source.startsWith(path.resolve(publicDir) + path.sep)) fail('MOBILE_SOURCE_PATH_ESCAPE', relative);
    if (!destination.startsWith(path.resolve(wwwDir) + path.sep)) fail('MOBILE_DESTINATION_PATH_ESCAPE', relative);
    await mkdir(path.dirname(destination), { recursive: true });
    await cp(source, destination, { force: false, errorOnExist: true });
  }
  await cp(manifestPath, path.join(wwwDir, 'release-manifest.json'), { force: false, errorOnExist: true });

  const verified = await assertMobileBoundary(wwwDir, SOURCE_SHA);
  console.log('MOBILE_WEB_PREPARE=PASS');
  console.log(`MOBILE_WEB_SOURCE_SHA=${verified.sourceSha}`);
  console.log(`MOBILE_WEB_FILES=${verified.files}`);
}

main().catch((error) => {
  console.error(`MOBILE_WEB_PREPARE=BLOCKED\nREASON=${error?.message || error}`);
  process.exitCode = 1;
});
