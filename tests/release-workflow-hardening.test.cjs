const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const workflowPath = path.join(process.cwd(), '.github', 'workflows', 'pages.yml');
const workflow = fs.readFileSync(workflowPath, 'utf8');

function expect(text, description) {
  assert.match(workflow, text, description);
}

function reject(text, description) {
  assert.doesNotMatch(workflow, text, description);
}

test('production release is explicit manual dispatch only', () => {
  expect(/workflow_dispatch:/, 'workflow_dispatch must exist');
  expect(/release_sha:/, 'exact release_sha input must exist');
  reject(/\n\s*push\s*:/, 'push trigger must not exist');
});

test('release input is locked to exact main SHA before build', () => {
  expect(/EXPECTED_RELEASE_SHA/, 'workflow must bind expected release SHA');
  expect(/git\s+rev-parse\s+origin\/main/, 'workflow must resolve current main');
  expect(/RELEASE_SHA_MISMATCH/, 'workflow must fail closed on SHA mismatch');
});

test('production environments remain independent human gates', () => {
  expect(/environment:\s*\n\s*name:\s*production-build/, 'build must use production-build');
  expect(/environment:\s*\n\s*name:\s*github-pages/, 'deploy must use github-pages');
});

test('deployment permissions are scoped to deploy job', () => {
  expect(/permissions:\s*\n\s*contents:\s*read/, 'workflow default must be contents read');
  reject(/^\s{2}pages:\s*write$/m, 'workflow-level pages write is forbidden');
  reject(/^\s{2}id-token:\s*write$/m, 'workflow-level id-token write is forbidden');
  expect(/deploy:[\s\S]*?permissions:[\s\S]*?pages:\s*write[\s\S]*?id-token:\s*write/, 'deploy job must own pages/id-token write');
});

test('third-party GitHub actions are immutable SHA pinned', () => {
  reject(/uses:\s*actions\/(?:checkout|setup-node|setup-python|upload-pages-artifact|deploy-pages)@v\d+/, 'major action tags are forbidden');
  expect(/actions\/checkout@d23441a48e516b6c34aea4fa41551a30e30af803/, 'checkout pin missing');
  expect(/actions\/setup-node@249970729cb0ef3589644e2896645e5dc5ba9c38/, 'setup-node pin missing');
  expect(/actions\/setup-python@ece7cb06caefa5fff74198d8649806c4678c61a1/, 'setup-python pin missing');
  expect(/actions\/upload-pages-artifact@7b1f4a764d45c48632c6b24a0339c27f5614fb0b/, 'upload-pages-artifact pin missing');
  expect(/actions\/deploy-pages@d6db90164ac5ed86f2b6aed7e0febac5b3c0c03e/, 'deploy-pages pin missing');
});

test('release dependencies do not drift at runtime', () => {
  reject(/pip\s+install\s+--upgrade\s+pip/, 'pip self-upgrade is forbidden');
  expect(/pytest==9\.1\.1/, 'pytest must be pinned');
});

test('release manifest remains exact-source fail closed', () => {
  expect(/releaseEligible/, 'manifest eligibility check missing');
  expect(/RELEASE_MANIFEST_SHA_MISMATCH/, 'manifest exact SHA guard missing');
  expect(/--source-sha\s+"\$EXPECTED_RELEASE_SHA"/, 'builder must receive the locked SHA');
});
