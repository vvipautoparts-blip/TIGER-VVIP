const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

test('TIGER ONE semantic tokens exist without legacy brand authority', () => {
  const tokens = read('styles/tiger-one/tokens.css');

  assert.match(tokens, /--t1-surface-canvas:/);
  assert.match(tokens, /--t1-surface-raised:/);
  assert.match(tokens, /--t1-text-primary:/);
  assert.match(tokens, /--t1-action-primary:/);
  assert.match(tokens, /--t1-accent-vvip:/);
  assert.match(tokens, /--t1-focus-ring:/);
  assert.match(tokens, /--t1-radius-card:/);
  assert.match(tokens, /--t1-space-4:/);
  assert.match(tokens, /--t1-motion-standard:/);
  assert.doesNotMatch(tokens, /--fb-/);
});

test('TIGER ONE optical typography exposes bilingual semantic roles', () => {
  const type = read('styles/tiger-one/type.css');

  assert.match(type, /--t1-type-display:/);
  assert.match(type, /--t1-type-title-m:/);
  assert.match(type, /--t1-type-body-m:/);
  assert.match(type, /--t1-type-label-m:/);
  assert.match(type, /--t1-type-metric-m:/);
  assert.match(type, /font-family:/);
  assert.match(type, /font-variant-numeric:\s*tabular-nums/);
  assert.match(type, /:lang\(ar\)/);
  assert.match(type, /:lang\(en\)/);
});
