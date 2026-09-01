'use strict';

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const authorityPath = path.join(root, 'docs/owner-control/TIGER_FACEBOOK_1_TO_1_FAMILIARITY_2026_CURRENT_OWNER_AUTHORITY.md');
const source = fs.readFileSync(authorityPath, 'utf8');

test('social familiarity authority is subordinate to the current owner binding and NEXUS', () => {
  assert.match(source, /TIGER_OWNER_BINDING_CURRENT\.md/);
  assert.match(source, /TIGER_NEXUS_2026_CURRENT_OWNER_AUTHORITY\.md/);
  assert.match(source, /CURRENT_ONLY/);
  assert.match(source, /ماذا تعرض أو تحتاج/);
  assert.match(source, /Living Sector Object/i);
});

test('social familiarity authority cannot restore a parallel Marketplace creation product', () => {
  assert.doesNotMatch(source, /Marketplace listing creation must remain a distinct commercial flow/i);
  assert.doesNotMatch(source, /social post composer[\s\S]{0,120}distinct commercial flow/i);
  assert.match(source, /same Living Sector Object/i);
  assert.match(source, /not a parallel product/i);
});

test('social familiarity authority cannot override the current convergence execution order', () => {
  assert.doesNotMatch(source, /close P0-B[\s\S]{0,120}first/i);
  assert.match(source, /PR #349/);
  assert.match(source, /exact-head/i);
  assert.match(source, /runner-executed GREEN/i);
});
