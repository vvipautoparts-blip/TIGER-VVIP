'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

test('SPGF is sole supreme owner architecture and SGF top-level authority is deleted', () => {
  const binding = read('docs/owner-control/TIGER_OWNER_BINDING_CURRENT.md');
  const router = read('docs/owner-control/TIGER_OWNER_CURRENT_REFERENCE_AR.md');
  const registry = JSON.parse(read('project-control/authority/authority-registry.v1.json'));

  assert.match(binding, /TIGER_SOVEREIGN_PROOF_GENOME_FABRIC_2026_CURRENT_OWNER_AUTHORITY\.md/);
  assert.doesNotMatch(binding, /TIGER_SOVEREIGN_GENOME_FABRIC_2026_CURRENT_OWNER_AUTHORITY\.md/);
  assert.match(router, /TIGER_SOVEREIGN_PROOF_GENOME_FABRIC_2026_CURRENT_OWNER_AUTHORITY\.md/);
  assert.doesNotMatch(router, /config\/sovereignty\/sgf-v1\.json/);

  assert.equal(fs.existsSync(path.join(root, 'docs/owner-control/TIGER_SOVEREIGN_GENOME_FABRIC_2026_CURRENT_OWNER_AUTHORITY.md')), false);
  assert.equal(fs.existsSync(path.join(root, 'docs/superpowers/specs/2026-08-29-tiger-sovereign-genome-fabric-2026.md')), false);
  assert.equal(fs.existsSync(path.join(root, 'docs/superpowers/plans/2026-08-29-tiger-sgf-foundation.md')), false);
  assert.equal(fs.existsSync(path.join(root, 'docs/superpowers/plans/2026-08-29-tiger-sgf-runtime-zero-default-convergence.md')), false);

  assert.equal(registry.records.some((record) => record.authority_id === 'authority.sovereign-genome-fabric.v1'), false);
  assert.equal(registry.records.some((record) => record.authority_id === 'authority.sovereign-proof-genome-fabric.v1'), true);
});
