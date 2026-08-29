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
  const fusion = JSON.parse(read('config/fusion/current-authority.json'));
  const registry = JSON.parse(read('project-control/authority/authority-registry.v1.json'));

  assert.match(binding, /TIGER_SOVEREIGN_PROOF_GENOME_FABRIC_2026_CURRENT_OWNER_AUTHORITY\.md/);
  assert.doesNotMatch(binding, /TIGER_SOVEREIGN_GENOME_FABRIC_2026_CURRENT_OWNER_AUTHORITY\.md/);
  assert.match(router, /TIGER_SOVEREIGN_PROOF_GENOME_FABRIC_2026_CURRENT_OWNER_AUTHORITY\.md/);
  assert.doesNotMatch(router, /config\/sovereignty\/sgf-v1\.json/);
  assert.equal(fusion.tigerSpgfOwnerReference, 'docs/owner-control/TIGER_SOVEREIGN_PROOF_GENOME_FABRIC_2026_CURRENT_OWNER_AUTHORITY.md');
  assert.equal(fusion.tigerSpgfConfig, 'config/sovereignty/spgf-v1.json');
  assert.equal(Object.prototype.hasOwnProperty.call(fusion, 'tigerSgfOwnerReference'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(fusion, 'tigerSgfConfig'), false);

  const removed = [
    'docs/owner-control/TIGER_SOVEREIGN_GENOME_FABRIC_2026_CURRENT_OWNER_AUTHORITY.md',
    'docs/superpowers/specs/2026-08-29-tiger-sovereign-genome-fabric-2026.md',
    'docs/superpowers/plans/2026-08-29-tiger-sgf-foundation.md',
    'docs/superpowers/plans/2026-08-29-tiger-sgf-runtime-zero-default-convergence.md',
    'config/sovereignty/sgf-v1.json',
    'scripts/sovereignty/verify-sgf-authority.cjs',
    'tests/sgf-sovereignty-authority.test.cjs',
    'tests/sgf-crypto-authority-binding.test.cjs',
    'tests/sgf-zero-default-current-contract.test.cjs'
  ];

  for (const relative of removed) {
    assert.equal(fs.existsSync(path.join(root, relative)), false, `${relative} must not exist in current tree`);
  }

  assert.equal(registry.records.some((record) => record.authority_id === 'authority.sovereign-genome-fabric.v1'), false);
  const spgf = registry.records.find((record) => record.authority_id === 'authority.sovereign-proof-genome-fabric.v1');
  assert.ok(spgf);
  assert.equal(spgf.status, 'CURRENT_ONLY');
  assert.ok(spgf.supersedes.includes('authority.sovereign-genome-fabric.v1'));
  assert.ok(spgf.protected_boundaries.includes('no-parallel-sovereign-authority'));
});
