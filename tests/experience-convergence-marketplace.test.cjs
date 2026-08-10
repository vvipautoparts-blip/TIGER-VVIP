const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const js = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'vvip-production-marketplace.js'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '..', 'styles', 'vvip-production-marketplace.css'), 'utf8');

const sevenSectors = [
  'automotive',
  'real-estate',
  'construction',
  'professional-services',
  'equipment',
  'trade-supply',
  'engineering-consulting'
];

test('marketplace exposes the seven approved sectors', () => {
  for (const sector of sevenSectors) assert.match(js, new RegExp(sector.replace('-', '\\-')));
});

test('create flow is content-first and reveals visibility/payment only after completion', () => {
  assert.match(js, /data-vvip-create-flow/);
  assert.match(js, /data-vvip-content-step/);
  assert.match(js, /data-vvip-preview-step/);
  assert.match(js, /data-vvip-plan-step/);
  assert.match(js, /data-vvip-payment-step/);
  assert.doesNotMatch(js, /سيُحفظ الإعلان ويُرسل للمراجعة\. لن يظهر للعامة قبل الاعتماد\./);
  assert.doesNotMatch(js, /تم حفظ الإعلان وإرساله للمراجعة/);
});

test('modern cards provide primary contact and lightweight secondary actions', () => {
  assert.match(js, /data-vvip-card-contact/);
  assert.match(js, /data-vvip-card-save/);
  assert.match(js, /data-vvip-card-share/);
  assert.match(js, /data-vvip-fab/);
});

test('2026 interaction shell includes accessibility, motion preference and mobile responsiveness', () => {
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /@media\s*\([^)]*max-width/);
  assert.match(css, /transition:/);
  assert.match(css, /\.vvip-fab/);
});
