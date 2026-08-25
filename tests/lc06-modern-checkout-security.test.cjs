'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const workflowPath = path.join(__dirname, '..', '.github', 'workflows', 'lc06-rls-performance-hardening-rehearsal.yml');
const CHECKOUT_V7_0_1_SHA = '3d3c42e5aac5ba805825da76410c181273ba90b1';
const LEGACY_CHECKOUT_SHA = 'b4ffde65f46336ab88eb53be808477a3936bae11';

function workflow() {
  return fs.readFileSync(workflowPath, 'utf8');
}

test('LC06 pins checkout v7.0.1 and never persists repository credentials', () => {
  const text = workflow();

  assert.match(
    text,
    new RegExp(`actions/checkout@${CHECKOUT_V7_0_1_SHA}`),
    'LC06 must pin actions/checkout v7.0.1 by immutable SHA'
  );
  assert.doesNotMatch(text, new RegExp(`actions/checkout@${LEGACY_CHECKOUT_SHA}`));

  const checkoutBlock = text.match(/- name: Checkout exact source SHA[\s\S]*?(?=\n\s*- (?:name:|uses:)|$)/)?.[0] ?? '';
  assert.match(checkoutBlock, /ref:\s*\$\{\{ env\.SOURCE_SHA \}\}/);
  assert.match(checkoutBlock, /fetch-depth:\s*0/);
  assert.match(checkoutBlock, /persist-credentials:\s*false/);
  assert.match(text, /permissions:\s*\n\s*contents:\s*read/);
});
