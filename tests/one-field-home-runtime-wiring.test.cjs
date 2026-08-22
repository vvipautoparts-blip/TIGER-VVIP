'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

function read(relative) {
  return fs.readFileSync(path.join(ROOT, relative), 'utf8');
}

test('Home exposes ONE FIELD intent controls without repurposing Marketplace search', () => {
  const html = read('index.html');
  assert.match(html, /data-one-field-intent-form/);
  assert.match(html, /data-one-field-intent-input/);
  assert.match(html, /data-one-field-intent-submit/);
  assert.match(html, /data-one-field-runtime-status[^>]*aria-live="polite"/);
  assert.match(html, /data-one-field-organic-results/);
  assert.match(html, /data-one-field-sponsored-results[^>]*hidden/);
  assert.match(html, /data-listing-search/);
  assert.ok(html.indexOf('data-one-field-intent-input') < html.indexOf('data-social-marketplace-surface'));
});

test('Home ONE FIELD loads semantic and runtime dependencies in reviewable order', () => {
  const html = read('index.html');
  const ordered = [
    'scripts/discovery/one-field-semantic-core.js',
    'scripts/discovery/one-field-intent-scene.js',
    'scripts/discovery/one-field-semantic-capsule.js',
    'scripts/discovery/one-field-hybrid-retrieval.js',
    'scripts/discovery/one-field-fit-facets.js',
    'scripts/discovery/one-field-runtime-adapters.js',
    'scripts/discovery/one-field-runtime-orchestrator.js',
    'scripts/discovery/one-field-runtime-controller.js',
    'scripts/discovery/one-field-runtime-view.js'
  ];

  let previous = -1;
  for (const file of ordered) {
    const index = html.indexOf(file);
    assert.ok(index > previous, `${file} must load after its dependencies`);
    previous = index;
  }
  assert.match(html, /styles\/tiger-social\/one-field-runtime\.css/);
});

test('ONE FIELD surface copy stops at discovery and contact handoff', () => {
  const html = read('index.html');
  const start = html.indexOf('data-one-field-intent-form');
  const end = html.indexOf('data-social-post-composer', start);
  assert.ok(start >= 0 && end > start);
  const surface = html.slice(start, end).toLowerCase();
  for (const denied of ['تم الشراء', 'تم الطلب', 'checkout', 'order completed', 'payment successful', 'escrow']) {
    assert.equal(surface.includes(denied), false, `denied transaction copy: ${denied}`);
  }
  assert.match(surface, /تواصل مباشر|عرض التفاصيل/);
});

test('ONE FIELD stylesheet is responsive, RTL-safe, and reduced-motion-safe', () => {
  const css = read('styles/tiger-social/one-field-runtime.css');
  assert.match(css, /margin-inline|padding-inline|inset-inline|inline-size/);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(css, /@media\s*\(max-width:/);
});

test('runtime view keeps organic and sponsored projections structurally separate', () => {
  const source = read('scripts/discovery/one-field-runtime-view.js');
  assert.match(source, /data-one-field-organic-results/);
  assert.match(source, /data-one-field-sponsored-results/);
  assert.match(source, /ممول/);
  assert.match(source, /tel:/);
  assert.doesNotMatch(source, /innerHTML\s*=/);
});
