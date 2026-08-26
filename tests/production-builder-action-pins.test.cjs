'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const BUILDER_PATH = path.join(
  __dirname,
  '..',
  '.github',
  'workflows',
  'production-release-artifact.yml',
);

const builder = fs.readFileSync(BUILDER_PATH, 'utf8');

const VERIFIED_PINS = Object.freeze([
  'actions/checkout@d23441a48e516b6c34aea4fa41551a30e30af803',
  'actions/setup-node@249970729cb0ef3589644e2896645e5dc5ba9c38',
  'actions/setup-python@ece7cb06caefa5fff74198d8649806c4678c61a1',
]);

const RETIRED_UNRESOLVABLE_PINS = Object.freeze([
  'actions/checkout@de0fac2e4500dabe0009e67214ff5f544a08e6b0',
  'actions/setup-node@1e60f620b9541d04c50fe4240f6b88442fc18c18',
  'actions/setup-python@a079284f6907d469567d7000a6d0159d034d90b0',
]);

test('Production builder uses the verified official immutable action pins required by the release runner', () => {
  for (const pin of VERIFIED_PINS) {
    assert.ok(builder.includes(pin), `missing verified pin: ${pin}`);
  }

  for (const pin of RETIRED_UNRESOLVABLE_PINS) {
    assert.equal(builder.includes(pin), false, `unresolvable pin must stay retired: ${pin}`);
  }
});
