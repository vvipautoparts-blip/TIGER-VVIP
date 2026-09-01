'use strict';

const fs = require('node:fs');
const assert = require('node:assert/strict');
const test = require('node:test');

const oldTigerOne = 'docs/owner-control/TIGER_ONE_2026_CURRENT_OWNER_AUTHORITY.md';
const nexusAuthority = 'docs/owner-control/TIGER_NEXUS_2026_CURRENT_OWNER_AUTHORITY.md';
const registry = JSON.parse(fs.readFileSync('project-control/authority/authority-registry.v1.json', 'utf8'));
const ownerBinding = fs.readFileSync('docs/owner-control/TIGER_OWNER_BINDING_CURRENT.md', 'utf8');
const socialCore = fs.readFileSync('docs/owner-control/TIGER_SOCIAL_CORE_2026_CURRENT_OWNER_AUTHORITY.md', 'utf8');

test('superseded TIGER ONE current authority is physically absent from current tree', () => {
  assert.equal(fs.existsSync(oldTigerOne), false);
});

test('machine authority graph routes platform authority to NEXUS only', () => {
  const platform = registry.records.find((record) => record.domain === 'platform');
  assert.ok(platform);
  assert.equal(platform.status, 'CURRENT_ONLY');
  assert.equal(platform.owner_decision_ref, nexusAuthority);
  assert.equal(platform.canonical_path, nexusAuthority);
  assert.equal(registry.records.some((record) => record.canonical_path === oldTigerOne), false);
});

test('owner binding and Social Core defer current publication semantics to NEXUS', () => {
  assert.match(ownerBinding, /TIGER_NEXUS_2026_CURRENT_OWNER_AUTHORITY\.md/);
  assert.match(socialCore, /TIGER_NEXUS_2026_CURRENT_OWNER_AUTHORITY\.md/);
  assert.match(socialCore, /Living Sector Object/);
  assert.match(socialCore, /OFFER.*NEED.*SERVICE.*OPPORTUNITY/is);
});
