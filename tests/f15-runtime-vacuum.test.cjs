'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { verifyRuntimeVacuum } = require('../scripts/launch/verify-runtime-vacuum.cjs');

function tree() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tiger-f15-'));
  fs.mkdirSync(path.join(root, 'scripts/nexus'), { recursive: true });
  fs.mkdirSync(path.join(root, 'scripts/social'), { recursive: true });
  fs.mkdirSync(path.join(root, 'scripts/fusion'), { recursive: true });
  fs.writeFileSync(path.join(root, 'index.html'), '<script src="scripts/nexus/bootstrap.js"></script>');
  fs.writeFileSync(path.join(root, 'scripts/nexus/bootstrap.js'), "export const current='NEXUS';");
  return root;
}

function cleanup(root) { fs.rmSync(root, { recursive: true, force: true }); }

test('clean current runtime tree passes vacuum scan', () => {
  const root = tree();
  try {
    const result = verifyRuntimeVacuum({ root });
    assert.equal(result.ok, true, result.errors.join('\n'));
  } finally { cleanup(root); }
});

test('vacuum rejects restored standalone marketplace transaction runtimes', () => {
  const root = tree();
  try {
    const target = path.join(root, 'scripts/runtime/vvip-marketplace-repository.js');
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, 'legacy');
    const result = verifyRuntimeVacuum({ root });
    assert.equal(result.ok, false);
    assert.ok(result.errors.some(x => x.startsWith('F15_FORBIDDEN_RUNTIME_PATH:')));
  } finally { cleanup(root); }
});

test('vacuum rejects active references to deleted transaction runtimes', () => {
  const root = tree();
  try {
    fs.writeFileSync(path.join(root, 'scripts/nexus/bootstrap.js'), "import '../runtime/vvip-marketplace-repository.js';");
    const result = verifyRuntimeVacuum({ root });
    assert.equal(result.ok, false);
    assert.ok(result.errors.some(x => x.startsWith('F15_FORBIDDEN_RUNTIME_REFERENCE:')));
  } finally { cleanup(root); }
});

test('vacuum rejects superseded pricing/publication/lifetime tokens in active runtime', () => {
  const cases = ['PULSE_25', 'requestPublication(', '120 days', '4 posts/week'];
  for (const token of cases) {
    const root = tree();
    try {
      fs.writeFileSync(path.join(root, 'scripts/social/core.js'), `const old = ${JSON.stringify(token)};`);
      const result = verifyRuntimeVacuum({ root });
      assert.equal(result.ok, false, token);
      assert.ok(result.errors.some(x => x.startsWith('F15_SUPERSEDED_RUNTIME_TOKEN:')), token);
    } finally { cleanup(root); }
  }
});

test('vacuum ignores historical documentation evidence outside active runtime roots', () => {
  const root = tree();
  try {
    fs.mkdirSync(path.join(root, 'docs/history'), { recursive: true });
    fs.writeFileSync(path.join(root, 'docs/history/old.md'), 'PULSE_25 requestPublication( 120 days 4 posts/week');
    const result = verifyRuntimeVacuum({ root });
    assert.equal(result.ok, true, result.errors.join('\n'));
  } finally { cleanup(root); }
});
