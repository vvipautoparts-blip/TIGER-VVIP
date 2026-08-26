'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  compileGateResult,
  validateGateDefinitions,
} = require('../scripts/tsrf/evidence/gate-compiler.cjs');
const { createEvidenceEnvelope } = require('../scripts/tsrf/evidence/evidence-envelope.cjs');

const NOW = Date.parse('2026-08-25T18:00:00.000Z');
const SOURCE = '1'.repeat(40);
const TREE = '2'.repeat(40);
const SUBJECT = 'sha256:' + '3'.repeat(64);

function definition(extra = {}) {
  return {
    id: 'P01',
    evidence_class: 'SOURCE_IDENTITY',
    environment: 'CI',
    subject: SUBJECT,
    max_age_ms: 300000,
    prerequisites: [],
    required_facts: ['exact_source', 'exact_tree'],
    ...extra,
  };
}

function trusted(extra = {}) {
  return {
    producer_identity: 'github-actions:quality-gate',
    runner_identity: 'github-hosted:ubuntu',
    workflow_identity: '.github/workflows/vvip-quality-gate.yml',
    expected_source_sha: SOURCE,
    expected_source_tree: TREE,
    source_sha: SOURCE,
    source_tree: TREE,
    environment: 'CI',
    now_ms: NOW,
    ...extra,
  };
}

function envelope(extra = {}) {
  return createEvidenceEnvelope({
    gate_id: 'P01',
    evidence_class: 'SOURCE_IDENTITY',
    subject: SUBJECT,
    observed_at: '2026-08-25T17:59:00.000Z',
    facts: { exact_source: 'PASS', exact_tree: 'PASS' },
    ...extra,
  });
}

test('V1 valid exact-source evidence compiles deterministically to PASS', () => {
  const input = { definition: definition(), evidence: [envelope()], trustedContext: trusted(), prerequisiteResults: {} };
  const first = compileGateResult(input);
  const second = compileGateResult(input);
  assert.equal(first.result, 'PASS');
  assert.equal(first.result_digest, second.result_digest);
  assert.deepEqual(first, second);
});

test('V1 missing evidence is BLOCKED', () => {
  assert.equal(compileGateResult({ definition: definition(), evidence: [], trustedContext: trusted(), prerequisiteResults: {} }).result, 'BLOCKED');
});

test('V1 stale and future evidence are BLOCKED', () => {
  assert.equal(compileGateResult({ definition: definition(), evidence: [envelope({ observed_at: '2026-08-25T17:00:00.000Z' })], trustedContext: trusted(), prerequisiteResults: {} }).result, 'BLOCKED');
  assert.equal(compileGateResult({ definition: definition(), evidence: [envelope({ observed_at: '2026-08-25T18:10:00.000Z' })], trustedContext: trusted(), prerequisiteResults: {} }).result, 'BLOCKED');
});

test('V1 forged producer fields in payload fail closed before compilation', () => {
  for (const trustedField of [
    'producer_identity',
    'runner_identity',
    'workflow_identity',
    'source_sha',
    'source_tree',
    'environment',
  ]) {
    assert.throws(() => createEvidenceEnvelope({
      gate_id: 'P01', evidence_class: 'SOURCE_IDENTITY', subject: SUBJECT,
      observed_at: '2026-08-25T17:59:00.000Z', facts: { exact_source: 'PASS' },
      [trustedField]: 'forged',
    }), /trusted/i);
  }
});

test('V1 wrong source, subject, or environment are BLOCKED', () => {
  for (const [def, ctx, ev] of [
    [definition(), trusted({ source_sha: '4'.repeat(40) }), envelope()],
    [definition({ subject: 'sha256:' + '5'.repeat(64) }), trusted(), envelope()],
    [definition(), trusted({ environment: 'PRODUCTION' }), envelope()],
  ]) {
    assert.equal(compileGateResult({ definition: def, evidence: [ev], trustedContext: ctx, prerequisiteResults: {} }).result, 'BLOCKED');
  }
});

test('V1 unsatisfied prerequisites are BLOCKED', () => {
  const def = definition({ id: 'P02', prerequisites: ['P01'] });
  const ev = envelope({ gate_id: 'P02' });
  assert.equal(compileGateResult({ definition: def, evidence: [ev], trustedContext: trusted(), prerequisiteResults: { P01: 'BLOCKED' } }).result, 'BLOCKED');
});

test('V1 prerequisite PASS must be a digest-valid compiler result bound to the same source', () => {
  const prerequisite = compileGateResult({
    definition: definition(),
    evidence: [envelope()],
    trustedContext: trusted(),
    prerequisiteResults: {},
  });
  const def = definition({ id: 'P02', prerequisites: ['P01'] });
  const ev = envelope({ gate_id: 'P02' });

  assert.equal(compileGateResult({
    definition: def,
    evidence: [ev],
    trustedContext: trusted(),
    prerequisiteResults: { P01: 'PASS' },
  }).result, 'BLOCKED');
  assert.equal(compileGateResult({
    definition: def,
    evidence: [ev],
    trustedContext: trusted(),
    prerequisiteResults: { P01: prerequisite },
  }).result, 'PASS');
  assert.equal(compileGateResult({
    definition: def,
    evidence: [ev],
    trustedContext: trusted({ source_sha: '4'.repeat(40), expected_source_sha: '4'.repeat(40) }),
    prerequisiteResults: { P01: prerequisite },
  }).result, 'BLOCKED');
});

test('V1 unknown, SKIPPED, or non-passing required facts cannot become PASS', () => {
  for (const value of ['UNKNOWN', 'SKIPPED', 'BLOCKED']) {
    const ev = envelope({ facts: { exact_source: value, exact_tree: 'PASS' } });
    assert.equal(compileGateResult({ definition: definition(), evidence: [ev], trustedContext: trusted(), prerequisiteResults: {} }).result, 'BLOCKED');
  }
});

test('V1 negative auxiliary facts cannot be hidden behind passing required facts', () => {
  for (const value of ['FAIL', 'BLOCKED', 'UNKNOWN', 'SKIPPED']) {
    const ev = envelope({
      facts: {
        exact_source: 'PASS',
        exact_tree: 'PASS',
        auxiliary_check: value,
      },
    });
    const compiled = compileGateResult({
      definition: definition(),
      evidence: [ev],
      trustedContext: trusted(),
      prerequisiteResults: {},
    });
    assert.equal(compiled.result, 'BLOCKED');
    assert.ok(compiled.reason_codes.includes('EVIDENCE_NEGATIVE_FACT'));
  }
});

test('V1 gate definitions reject cycles and unknown prerequisites', () => {
  assert.throws(() => validateGateDefinitions([
    definition({ id: 'P01', prerequisites: ['P02'] }),
    definition({ id: 'P02', prerequisites: ['P01'] }),
  ]), /cycle/i);
  assert.throws(() => validateGateDefinitions([definition({ prerequisites: ['P99'] })]), /prerequisite/i);
});

test('V1 registry contains exactly P01 through P20 and stays fail closed', () => {
  const registry = require('../project-control/production-handover/gates.v1.json');
  assert.equal(registry.schema_version, 'TIGER_VERITY_GATES_V1');
  assert.deepEqual(registry.gates.map((gate) => gate.id), Array.from({ length: 20 }, (_, i) => `P${String(i + 1).padStart(2, '0')}`));
  assert.ok(registry.gates.every((gate) => gate.fail_closed === true));
  validateGateDefinitions(registry.gates);
});
