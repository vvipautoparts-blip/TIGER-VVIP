import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const APP_ID = 'com.vviptiger.app';
const REQUIRED_SDK = 36;

function fail(code, detail = '') {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function replaceRequired(text, pattern, replacement, code) {
  if (!pattern.test(text)) fail(code);
  return text.replace(pattern, replacement);
}

export async function patchAndroid(mobileDir) {
  const androidDir = path.join(mobileDir, 'android');
  const variablesPath = path.join(androidDir, 'variables.gradle');
  const buildPath = path.join(androidDir, 'app', 'build.gradle');
  const manifestPath = path.join(androidDir, 'app', 'src', 'main', 'AndroidManifest.xml');

  let variables = await readFile(variablesPath, 'utf8');
  variables = replaceRequired(
    variables,
    /compileSdkVersion\s*=\s*\d+/,
    `compileSdkVersion = ${REQUIRED_SDK}`,
    'MOBILE_ANDROID_COMPILE_SDK_MISSING',
  );
  variables = replaceRequired(
    variables,
    /targetSdkVersion\s*=\s*\d+/,
    `targetSdkVersion = ${REQUIRED_SDK}`,
    'MOBILE_ANDROID_TARGET_SDK_MISSING',
  );
  await writeFile(variablesPath, variables, 'utf8');

  const build = await readFile(buildPath, 'utf8');
  if (!build.includes(APP_ID)) fail('MOBILE_ANDROID_APP_ID_MISMATCH');

  let manifest = await readFile(manifestPath, 'utf8');
  if (/android:usesCleartextTraffic\s*=\s*["']true["']/i.test(manifest)) {
    fail('MOBILE_ANDROID_CLEARTEXT_ENABLED');
  }
  if (/android:usesCleartextTraffic\s*=/i.test(manifest)) {
    manifest = manifest.replace(
      /android:usesCleartextTraffic\s*=\s*["'][^"']*["']/i,
      'android:usesCleartextTraffic="false"',
    );
  } else {
    manifest = manifest.replace(/<application\b/, '<application android:usesCleartextTraffic="false"');
  }
  await writeFile(manifestPath, manifest, 'utf8');

  const finalVariables = await readFile(variablesPath, 'utf8');
  const finalManifest = await readFile(manifestPath, 'utf8');
  if (!new RegExp(`compileSdkVersion\\s*=\\s*${REQUIRED_SDK}\\b`).test(finalVariables)) {
    fail('MOBILE_ANDROID_COMPILE_SDK_NOT_ENFORCED');
  }
  if (!new RegExp(`targetSdkVersion\\s*=\\s*${REQUIRED_SDK}\\b`).test(finalVariables)) {
    fail('MOBILE_ANDROID_TARGET_SDK_NOT_ENFORCED');
  }
  if (!/android:usesCleartextTraffic="false"/i.test(finalManifest)) {
    fail('MOBILE_ANDROID_CLEARTEXT_NOT_EXPLICITLY_DISABLED');
  }

  console.log('MOBILE_ANDROID_PATCH=PASS');
}

async function main() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  await patchAndroid(path.resolve(here, '..'));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`MOBILE_ANDROID_PATCH=BLOCKED\nREASON=${error?.message || error}`);
    process.exitCode = 1;
  });
}
