'use strict';

const assert = require('assert');
const {
  REQUIRED_LAYERS,
  evaluateClosure,
} = require('./global-production-closure-gate.js');

const requiredLayerIds = [
  'production_backend',
  'identity_security',
  'marketplace',
  'campaigns_payments',
  'global_infrastructure',
  'legal_country_activation',
  'observability',
  'launch_tests',
  'release_environments',
  'launch_gate',
];

function makePassingLayer(id) {
  return {
    id,
    status: 'pass',
    evidence: [{ type: 'machine', ref: `test:${id}`, verified: true }],
  };
}

function makePassingManifest() {
  return {
    schema_version: 1,
    fail_closed: true,
    unresolved_p0: 0,
    unresolved_p1: 0,
    layers: requiredLayerIds.map(makePassingLayer),
  };
}

assert.deepStrictEqual(REQUIRED_LAYERS, requiredLayerIds, 'the production closure contract must cover exactly the ten owner-mandated layers');

{
  const manifest = makePassingManifest();
  manifest.layers.find((layer) => layer.id === 'campaigns_payments').status = 'blocked';
  const result = evaluateClosure(manifest);
  assert.strictEqual(result.ready, false, 'a blocked layer must fail the global launch gate');
  assert(result.blockers.some((item) => item.includes('campaigns_payments')), 'the blocker must identify the failing layer');
}

{
  const manifest = makePassingManifest();
  manifest.layers.find((layer) => layer.id === 'observability').evidence = [];
  const result = evaluateClosure(manifest);
  assert.strictEqual(result.ready, false, 'a pass status without verified evidence must fail closed');
}

{
  const manifest = makePassingManifest();
  manifest.unresolved_p0 = 1;
  const result = evaluateClosure(manifest);
  assert.strictEqual(result.ready, false, 'an unresolved P0 must block launch');
}

{
  const manifest = makePassingManifest();
  manifest.unresolved_p1 = 2;
  const result = evaluateClosure(manifest);
  assert.strictEqual(result.ready, false, 'an unresolved P1 must block launch');
}

{
  const manifest = makePassingManifest();
  manifest.fail_closed = false;
  const result = evaluateClosure(manifest);
  assert.strictEqual(result.ready, false, 'launch authority must itself be fail-closed');
}

{
  const result = evaluateClosure(makePassingManifest());
  assert.strictEqual(result.ready, true, 'all ten verified layers with zero P0/P1 must pass');
  assert.deepStrictEqual(result.blockers, []);
}

console.log('global-production-closure-gate.test.js: PASS');
