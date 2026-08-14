'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function loadBrowserModule(path) {
  const source = fs.readFileSync(path, 'utf8');
  const context = vm.createContext({
    console,
    Date,
    Error,
    TypeError,
    Uint8Array,
    ArrayBuffer,
    BigInt,
    Number,
    Object,
    Set,
    String,
    Math,
    Promise
  });
  vm.runInContext(source, context, { filename: path });
  return context;
}

test('F05 pure client modules load without CommonJS globals and expose frozen browser APIs', () => {
  const cases = [
    ['scripts/media/f05-heif-preflight.js', 'VVIP_F05_HEIF_PREFLIGHT', 'probeHeifHeader'],
    ['scripts/media/f05-heif-policy.js', 'VVIP_F05_HEIF_POLICY', 'admitHeifDecode'],
    ['scripts/media/f05-decoder-policy.js', 'VVIP_F05_DECODER_POLICY', 'validateDecoderPolicy'],
    ['scripts/media/f05-heif-adapter.js', 'VVIP_F05_HEIF_ADAPTER', 'createHeifAdapter'],
    ['scripts/media/f05-pr36-media-bridge.js', 'VVIP_F05_PR36_MEDIA_BRIDGE', 'createF05MediaPolicyBridge']
  ];

  for (const [path, globalName, method] of cases) {
    const context = loadBrowserModule(path);
    assert.ok(context[globalName], `${path} should expose ${globalName}`);
    assert.equal(typeof context[globalName][method], 'function', `${path} should expose ${method}`);
    assert.equal(Object.isFrozen(context[globalName]), true, `${globalName} should be frozen`);
  }
});

test('F05 CommonJS exports remain available after browser compatibility refactor', () => {
  assert.equal(typeof require('../scripts/media/f05-heif-preflight.js').probeHeifHeader, 'function');
  assert.equal(typeof require('../scripts/media/f05-heif-policy.js').admitHeifDecode, 'function');
  assert.equal(typeof require('../scripts/media/f05-decoder-policy.js').validateDecoderPolicy, 'function');
  assert.equal(typeof require('../scripts/media/f05-heif-adapter.js').createHeifAdapter, 'function');
  assert.equal(typeof require('../scripts/media/f05-pr36-media-bridge.js').createF05MediaPolicyBridge, 'function');
});
