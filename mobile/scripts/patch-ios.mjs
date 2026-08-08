import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const APP_ID = 'com.vviptiger.app';
const APP_NAME = 'VVIP TIGER';

function fail(code, detail = '') {
  throw new Error(detail ? `${code}:${detail}` : code);
}

export async function patchIos(mobileDir) {
  const iosDir = path.join(mobileDir, 'ios');
  const projectPath = path.join(iosDir, 'App', 'App.xcodeproj', 'project.pbxproj');
  const plistPath = path.join(iosDir, 'App', 'App', 'Info.plist');

  let project = await readFile(projectPath, 'utf8');
  if (!/PRODUCT_BUNDLE_IDENTIFIER\s*=\s*[^;]+;/g.test(project)) {
    fail('MOBILE_IOS_BUNDLE_IDENTIFIER_MISSING');
  }
  project = project.replace(
    /PRODUCT_BUNDLE_IDENTIFIER\s*=\s*[^;]+;/g,
    `PRODUCT_BUNDLE_IDENTIFIER = ${APP_ID};`,
  );
  await writeFile(projectPath, project, 'utf8');

  let plist = await readFile(plistPath, 'utf8');
  if (/NSAllowsArbitraryLoads[\s\S]{0,200}<true\s*\/>/i.test(plist)) {
    fail('MOBILE_IOS_NSALLOWSARBITRARYLOADS_ENABLED');
  }

  const displayNameBlock = /<key>CFBundleDisplayName<\/key>\s*<string>[^<]*<\/string>/i;
  if (displayNameBlock.test(plist)) {
    plist = plist.replace(
      displayNameBlock,
      `<key>CFBundleDisplayName</key>\n\t<string>${APP_NAME}</string>`,
    );
  } else {
    const dictClose = plist.lastIndexOf('</dict>');
    if (dictClose < 0) fail('MOBILE_IOS_PLIST_DICT_MISSING');
    plist = `${plist.slice(0, dictClose)}\t<key>CFBundleDisplayName</key>\n\t<string>${APP_NAME}</string>\n${plist.slice(dictClose)}`;
  }
  await writeFile(plistPath, plist, 'utf8');

  const finalProject = await readFile(projectPath, 'utf8');
  const finalPlist = await readFile(plistPath, 'utf8');
  if (!finalProject.includes(`PRODUCT_BUNDLE_IDENTIFIER = ${APP_ID};`)) {
    fail('MOBILE_IOS_BUNDLE_IDENTIFIER_NOT_ENFORCED');
  }
  if (!finalPlist.includes(`<string>${APP_NAME}</string>`)) {
    fail('MOBILE_IOS_DISPLAY_NAME_NOT_ENFORCED');
  }
  if (/NSAllowsArbitraryLoads[\s\S]{0,200}<true\s*\/>/i.test(finalPlist)) {
    fail('MOBILE_IOS_ATS_FAIL_OPEN');
  }

  console.log('MOBILE_IOS_PATCH=PASS');
}

async function main() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  await patchIos(path.resolve(here, '..'));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`MOBILE_IOS_PATCH=BLOCKED\nREASON=${error?.message || error}`);
    process.exitCode = 1;
  });
}
