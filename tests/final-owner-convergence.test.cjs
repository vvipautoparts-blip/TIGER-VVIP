'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const test = require('node:test');
const root = path.resolve(__dirname, '..');

function read(relative) {
  return fs.readFileSync(path.join(root, relative), 'utf8');
}

test('current project status cannot advertise superseded PR #345 as the active lane', () => {
  const status = read('docs/MASTER_PROJECT_STATE.md');
  assert.doesNotMatch(status, /Active lane:\s*PR #345\b/);
  assert.match(status, /PR #349\b/);
  assert.match(status, /TIGER NEXUS 2026/);
});

test('status surface remains subordinate to the mandatory owner binding', () => {
  const status = read('docs/MASTER_PROJECT_STATE.md');
  assert.match(status, /NON_AUTHORITATIVE_STATUS/);
  assert.match(status, /TIGER_OWNER_BINDING_CURRENT\.md/);
});

test('current deletion manifest exists and is bound to latest-only owner authority', () => {
  const manifest = read('docs/owner-control/DELETION_MANIFEST_CURRENT.md');
  assert.match(manifest, /TIGER_OWNER_BINDING_CURRENT\.md/);
  assert.match(manifest, /fusion-home-f02\.html/);
  assert.match(manifest, /scripts\/fusion\/f02-feed\.js/);
  assert.match(manifest, /scripts\/runtime\/vvip-marketplace-repository\.js/);
  assert.match(manifest, /Git history/i);
  assert.match(manifest, /no blind deletion/i);
});

test('human and machine current authorities converge on one NEXUS first reference', () => {
  const status = read('docs/MASTER_PROJECT_STATE.md');
  const binding = read('docs/owner-control/TIGER_OWNER_BINDING_CURRENT.md');
  const router = read('docs/owner-control/TIGER_OWNER_CURRENT_REFERENCE_AR.md');
  const config = JSON.parse(read('config/fusion/current-authority.json'));
  const registry = JSON.parse(read('project-control/authority/authority-registry.v1.json'));

  assert.equal(config.currentReference, 'docs/owner-control/TIGER_OWNER_BINDING_CURRENT.md');
  assert.equal(config.currentExperience, 'TIGER_NEXUS_2026');
  assert.equal(config.firstReferenceRequired, true);
  assert.match(binding, /Latest-only constitution/i);
  assert.match(router, /CURRENT_ONLY/);
  assert.match(status, /PR #349\b/);

  const owner = registry.records.find((record) => record.authority_id === 'authority.owner-constitution.v1');
  const platform = registry.records.filter((record) => record.domain === 'platform' && record.status === 'CURRENT_ONLY');
  assert.equal(owner?.canonical_path, 'docs/owner-control/TIGER_OWNER_BINDING_CURRENT.md');
  assert.equal(platform.length, 1);
  assert.equal(platform[0].canonical_path, 'docs/owner-control/TIGER_NEXUS_2026_CURRENT_OWNER_AUTHORITY.md');
  assert.deepEqual(platform[0].supersedes, ['TIGER_ONE_2026']);
});

test('current NEXUS implementation plan cannot resurrect deleted client Pulse Vault runtime', () => {
  const plan = read('docs/superpowers/plans/2026-08-29-tiger-nexus-2026.md');
  assert.doesNotMatch(plan, /Create:\s*`scripts\/nexus\/pulse-vault\.js`/);
  assert.doesNotMatch(plan, /Create:\s*`tests\/nexus\/pulse-vault\.test\.cjs`/);
  assert.match(plan, /scripts\/nexus\/pulse-runtime\.js/);
  assert.match(plan, /tests\/nexus\/pulse-runtime\.test\.cjs/);
});
