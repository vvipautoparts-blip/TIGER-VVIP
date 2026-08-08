import { createHash } from 'node:crypto';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectServerSecrets } from './secret-detector.mjs';

const TEXT_EXTENSIONS = new Set([
  '.html', '.htm', '.js', '.mjs', '.css', '.json', '.webmanifest', '.xml', '.plist', '.gradle', '.properties',
]);

function fail(code, detail = '') {
  const suffix = detail ? `:${detail}` : '';
  throw new Error(`${code}${suffix}`);
}

function safeManifestPath(relative) {
  const value = String(relative || '').replaceAll('\\', '/');
  if (!value || value.startsWith('/') || value.split('/').includes('..')) {
    fail('MOBILE_UNSAFE_MANIFEST_PATH', value);
  }
  return value;
}

async function sha256(filePath) {
  return createHash('sha256').update(await readFile(filePath)).digest('hex');
}

async function walkFiles(root) {
  const output = [];
  async function walk(current) {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(absolute);
      } else if (entry.isFile()) {
        output.push(absolute);
      }
    }
  }
  await walk(root);
  return output;
}

export async function assertMobileBoundary(root, expectedSha) {
  if (!expectedSha || !/^[0-9a-f]{40}$/i.test(expectedSha)) {
    fail('MOBILE_SOURCE_SHA_REQUIRED');
  }

  const manifestPath = path.join(root, 'release-manifest.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  if (manifest.releaseEligible !== true) fail('MOBILE_RELEASE_NOT_ELIGIBLE');
  if (manifest.sourceSha !== expectedSha) {
    fail('MOBILE_SOURCE_SHA_MISMATCH', `${manifest.sourceSha || 'missing'}!=${expectedSha}`);
  }
  if (!manifest.files || typeof manifest.files !== 'object' || Array.isArray(manifest.files)) {
    fail('MOBILE_RELEASE_MANIFEST_FILES_INVALID');
  }

  const allowed = new Set(['release-manifest.json']);
  for (const [relativeRaw, expectedHash] of Object.entries(manifest.files)) {
    const relative = safeManifestPath(relativeRaw);
    allowed.add(relative);
    const absolute = path.resolve(root, relative);
    const rootResolved = path.resolve(root) + path.sep;
    if (!absolute.startsWith(rootResolved)) fail('MOBILE_MANIFEST_PATH_ESCAPE', relative);
    const info = await stat(absolute).catch(() => null);
    if (!info?.isFile()) fail('MOBILE_MANIFEST_FILE_MISSING', relative);
    const actualHash = await sha256(absolute);
    if (actualHash !== expectedHash) fail('MOBILE_MANIFEST_HASH_MISMATCH', relative);
  }

  const files = await walkFiles(root);
  for (const absolute of files) {
    const relative = path.relative(root, absolute).replaceAll(path.sep, '/');
    if (!allowed.has(relative)) fail('MOBILE_UNLISTED_ARTIFACT_FILE', relative);
    if (!TEXT_EXTENSIONS.has(path.extname(relative).toLowerCase())) continue;
    const text = await readFile(absolute, 'utf8');
    const findings = detectServerSecrets(text);
    if (findings.length > 0) {
      fail('MOBILE_FORBIDDEN_SERVER_SECRET', `${findings[0].code}:${relative}`);
    }
  }

  return { sourceSha: manifest.sourceSha, files: Object.keys(manifest.files).length };
}

async function main() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const wwwDir = path.resolve(here, '..', 'www');
  const sourceSha = process.env.SOURCE_SHA || '';
  const result = await assertMobileBoundary(wwwDir, sourceSha);
  console.log('MOBILE_BOUNDARY=PASS');
  console.log(`MOBILE_BOUNDARY_SOURCE_SHA=${result.sourceSha}`);
  console.log(`MOBILE_BOUNDARY_FILES=${result.files}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`MOBILE_BOUNDARY=BLOCKED\nREASON=${error?.message || error}`);
    process.exitCode = 1;
  });
}
