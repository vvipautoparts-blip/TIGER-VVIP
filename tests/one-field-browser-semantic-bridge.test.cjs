'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');

const MODULES = Object.freeze([
  Object.freeze({ path: 'scripts/discovery/one-field-semantic-core.js', global: 'TIGEROneFieldSemanticCore', method: 'parseAcceptanceIntent' }),
  Object.freeze({ path: 'scripts/discovery/one-field-intent-scene.js', global: 'TIGEROneFieldIntentScene', method: 'createIntentFrame' }),
  Object.freeze({ path: 'scripts/discovery/one-field-semantic-capsule.js', global: 'TIGEROneFieldSemanticCapsule', method: 'createSemanticCapsule' }),
  Object.freeze({ path: 'scripts/discovery/one-field-hybrid-retrieval.js', global: 'TIGEROneFieldHybridRetrieval', method: 'retrieveCandidates' }),
  Object.freeze({ path: 'scripts/discovery/one-field-fit-facets.js', global: 'TIGEROneFieldFitFacets', method: 'createFitExplanation' })
]);

test('ONE FIELD semantic modules preserve CommonJS exports and expose browser globals', () => {
  for (const entry of MODULES) {
    const common = require(path.join(ROOT, entry.path));
    assert.equal(typeof common[entry.method], 'function', `${entry.path} CommonJS API must remain intact`);

    const code = fs.readFileSync(path.join(ROOT, entry.path), 'utf8');
    const sandbox = {};
    sandbox.globalThis = sandbox;
    vm.runInNewContext(code, sandbox, { filename: entry.path });
    assert.ok(sandbox[entry.global], `${entry.path} must expose ${entry.global} in browser mode`);
    assert.equal(typeof sandbox[entry.global][entry.method], 'function');
  }
});

test('browser semantic core uses the approved Arabic acceptance parser without a rigid category path', () => {
  const code = fs.readFileSync(path.join(ROOT, 'scripts/discovery/one-field-semantic-core.js'), 'utf8');
  const sandbox = {};
  sandbox.globalThis = sandbox;
  vm.runInNewContext(code, sandbox, { filename: 'one-field-semantic-core.js' });

  const intent = sandbox.TIGEROneFieldSemanticCore.parseAcceptanceIntent('أريد كورن فليكس للأطفال بدون سكر');
  assert.equal(intent.intentType, 'discover');
  assert.equal(intent.productFamily, 'breakfast_cereal');
  assert.equal(intent.audience, 'children');
  assert.deepEqual(Array.from(intent.constraints), ['no_added_sugar']);
  assert.deepEqual(Array.from(intent.categoryPath), []);
});
