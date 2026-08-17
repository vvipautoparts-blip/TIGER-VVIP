'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('F05 WASM runtime uses Fetch integrity metadata and an independent SHA-256 digest before instantiation', () => {
  const source = fs.readFileSync('workers/media/f05-heif-worker.js', 'utf8');
  assert.ok(source.includes("const WASM_SRI = 'sha256-NzcckaISZ95ySDj+Ykdsble0IrOp6/lUu8yguZqpnXg='"));
  assert.ok(source.includes("integrity: WASM_SRI"));
  assert.ok(source.includes("crypto.subtle.digest('SHA-256', wasmBinary)"));
  assert.ok(source.includes("digest !== WASM_SHA256"));
  assert.ok(source.indexOf("crypto.subtle.digest('SHA-256', wasmBinary)") < source.indexOf('return libheif({'));
});
