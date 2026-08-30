'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const PROMOTION_PATH = path.join(
  __dirname,
  '..',
  '.github',
  'workflows',
  'pages.yml',
);

const promotion = fs.readFileSync(PROMOTION_PATH, 'utf8');

const VERIFIED_PINS = Object.freeze([
  'actions/checkout@d23441a48e516b6c34aea4fa41551a30e30af803',
  'actions/setup-python@ece7cb06caefa5fff74198d8649806c4678c61a1',
]);

const RETIRED_UNRESOLVABLE_PINS = Object.freeze([
  'actions/checkout@de0fac2e4500dabe0009e67214ff5f544a08e6b0',
  'actions/setup-python@a079284f6907d469567d7000a6d0159d034d90b0',
]);

test('Production promotion uses verified official immutable action pins required by the release runner', () => {
  for (const pin of VERIFIED_PINS) {
    assert.ok(promotion.includes(pin), `missing verified pin: ${pin}`);
  }

  for (const pin of RETIRED_UNRESOLVABLE_PINS) {
    assert.equal(promotion.includes(pin), false, `unresolvable pin must stay retired: ${pin}`);
  }
});
