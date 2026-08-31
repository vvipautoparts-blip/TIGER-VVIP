'use strict';

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const spec = fs.readFileSync(path.join(root, 'docs/owner-control/VVIP_TIGER_DISCOVERY_EXPERIENCE_SPEC.md'), 'utf8');

test('discovery spec is subordinate to current owner binding and NEXUS', () => {
  assert.match(spec, /TIGER_OWNER_BINDING_CURRENT\.md/);
  assert.match(spec, /TIGER_NEXUS_2026_CURRENT_OWNER_AUTHORITY\.md/);
  assert.match(spec, /NON-AUTHORITY|NEXUS_SUBORDINATE/i);
  assert.match(spec, /Living Sector Object/i);
});

test('discovery spec cannot restore fixed-sector or legacy discovery runtime authority', () => {
  assert.doesNotMatch(spec, /window\.VVIPDiscovery\.setItems/);
  assert.doesNotMatch(spec, /فلاتر السيارات/);
  assert.doesNotMatch(spec, /فلاتر العقارات/);
  assert.doesNotMatch(spec, /فلاتر المواد والتموين والمستلزمات/);
  assert.match(spec, /activated|مفعّل/i);
  assert.match(spec, /registry/i);
  assert.match(spec, /scripts\/nexus\/sector-discovery\.js/);
});

test('discovery remains the same-object NEXUS module', () => {
  assert.match(spec, /same Living Sector Object|نفس.*Living Sector Object/i);
  assert.match(spec, /not a parallel product|ليس.*منتج.*مواز/i);
  assert.match(spec, /OFFER/);
  assert.match(spec, /NEED/);
  assert.match(spec, /SERVICE/);
  assert.match(spec, /OPPORTUNITY/);
});
