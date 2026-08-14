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

test('F05 original-media runtime has no upload or persistent-storage primitive; worker fetch is WASM-only', () => {
  const originalMediaSurface = [
    'scripts/media/f05-heif-preflight.js',
    'scripts/media/f05-heif-adapter.js',
    'scripts/media/f05-pr36-media-bridge.js',
    'scripts/media/f05-heif-worker-client.js',
    'scripts/media/pr36-controller.js'
  ];
  const forbiddenPersistenceOrUpload = /\bXMLHttpRequest\b|\bsendBeacon\s*\(|\bindexedDB\b|\blocalStorage\b|\bsessionStorage\b|\bcaches\s*\.\s*open\s*\(/;

  for (const file of originalMediaSurface) {
    const source = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(source, forbiddenPersistenceOrUpload, `${file} must not expose original media to network/persistent storage primitives`);
    assert.doesNotMatch(source, /\bfetch\s*\(/, `${file} must not fetch/upload original media`);
  }

  const workerSource = fs.readFileSync('workers/media/f05-heif-worker.js', 'utf8');
  assert.doesNotMatch(workerSource, forbiddenPersistenceOrUpload, 'HEIF worker must not persist or upload original bytes');
  assert.equal((workerSource.match(/\bfetch\s*\(/g) || []).length, 1, 'HEIF worker must have exactly one network fetch surface');
  assert.match(workerSource, /const wasmUrl\s*=\s*new URL\(`\.\/\$\{WASM_NAME\}`\s*,\s*import\.meta\.url\)/, 'worker fetch target must be its same-origin pinned WASM asset');
  assert.match(workerSource, /fetch\(wasmUrl\s*,\s*\{\s*credentials:\s*'same-origin'\s*,\s*cache:\s*'no-store'\s*\}\)/, 'the only worker fetch must consume wasmUrl');
  assert.doesNotMatch(workerSource, /fetch\([^)]*(?:bytes|job|message|file|blob)/i, 'worker must never fetch using media bytes/job/blob as a request surface');
});
