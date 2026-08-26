import test from 'node:test';
import assert from 'node:assert/strict';

import {
  FOUNDATION_TWIN_CLASSES,
  createTwinScenario,
  isTwinScenarioFresh,
  replayCounterfactual,
  verifyTwinScenario,
} from '../aion/twin-swarm.mjs';

const baseScenario = (overrides = {}) => ({
  scenario_id: 'scenario-release-001',
  twin_class: 'RELEASE',
  source_state_ref: 'proof-graph:release-baseline-001',
  source_release_sha: 'b9d0ad5acbd71254cceab751e3e6f064c70a50e6',
  created_at: '2026-08-25T14:30:00.000Z',
  expires_at: '2026-08-25T15:30:00.000Z',
  horizon_seconds: 3600,
  generator_version: 'aion-dream-orchestrator/1',
  model_version: 'twin-foundation/1',
  sensitivity: 'INTERNAL',
  data_mode: 'SANITIZED',
  execution_target: 'ISOLATED_TWIN',
  production_write_capability: false,
  assumptions: [
    { id: 'traffic-multiplier', value: 2 },
    { id: 'candidate-release', value: 'release-candidate-001' },
  ],
  ...overrides,
});

const baseReplay = (scenario, overrides = {}) => ({
  replay_id: 'replay-release-001',
  scenario,
  executed_at: '2026-08-25T14:40:00.000Z',
  now_ms: Date.parse('2026-08-25T14:40:00.000Z'),
  interventions: [
    { id: 'route-candidate', type: 'RELEASE_ROUTE', target: 'SHADOW', mode: 'SIMULATE' },
  ],
  observation_refs: ['evidence:latency-baseline', 'evidence:error-rate-baseline'],
  outcome: {
    status: 'HEALTHY',
    summary: 'candidate remains inside bounded release assumptions',
  },
  ...overrides,
});

test('exports only the first four A3 foundation twin classes', () => {
  assert.deepEqual([...FOUNDATION_TWIN_CLASSES].sort(), [
    'DATABASE', 'PERFORMANCE', 'RELEASE', 'SECURITY',
  ]);
});

test('creates a sealed isolated twin scenario with explicit future assumptions', () => {
  const scenario = createTwinScenario(baseScenario());
  assert.equal(scenario.schema_version, 'TIGER-AION-TWIN-SCENARIO-1');
  assert.equal(scenario.fact_class, 'SIMULATION');
  assert.equal(scenario.production_write_capability, false);
  assert.equal(scenario.execution_target, 'ISOLATED_TWIN');
  assert.equal(scenario.data_mode, 'SANITIZED');
  assert.match(scenario.content_digest, /^[a-f0-9]{64}$/);
  assert.equal(Object.isFrozen(scenario), true);
});

test('supports RELEASE, PERFORMANCE, DATABASE, and SECURITY scenarios', () => {
  for (const twinClass of FOUNDATION_TWIN_CLASSES) {
    const scenario = createTwinScenario(baseScenario({
      scenario_id: `scenario-${twinClass.toLowerCase()}-001`,
      twin_class: twinClass,
      source_release_sha: twinClass === 'RELEASE'
        ? 'b9d0ad5acbd71254cceab751e3e6f064c70a50e6'
        : undefined,
    }));
    assert.equal(scenario.twin_class, twinClass);
  }
});

test('rejects raw production data modes and any production execution target', () => {
  for (const input of [
    baseScenario({ data_mode: 'RAW_PRODUCTION' }),
    baseScenario({ execution_target: 'PRODUCTION' }),
    baseScenario({ production_write_capability: true }),
  ]) {
    assert.throws(
      () => createTwinScenario(input),
      (error) => error?.code === 'AION_TWIN_ISOLATION_VIOLATION',
    );
  }
});

test('rejects secret-bearing assumptions without storing the hostile material', () => {
  const privateMarker = ['-----BEGIN', ' PRIVATE KEY-----'].join('');
  for (const assumptions of [
    [{ id: 'credential', value: 'opaque' }],
    [{ id: 'harmless-name', value: privateMarker }],
    [{ id: 'authorization', value: 'not-a-real-credential' }],
  ]) {
    assert.throws(
      () => createTwinScenario(baseScenario({ assumptions })),
      (error) => error?.code === 'AION_TWIN_SECRET_MATERIAL_REJECTED',
    );
  }
});

test('freshness uses an injected clock and expires fail closed', () => {
  const scenario = createTwinScenario(baseScenario());
  assert.equal(isTwinScenarioFresh(scenario, Date.parse('2026-08-25T15:29:59.000Z')), true);
  assert.equal(isTwinScenarioFresh(scenario, Date.parse('2026-08-25T15:30:01.000Z')), false);
  assert.throws(
    () => replayCounterfactual(baseReplay(scenario, {
      executed_at: '2026-08-25T15:30:01.000Z',
      now_ms: Date.parse('2026-08-25T15:30:01.000Z'),
    })),
    (error) => error?.code === 'AION_TWIN_SCENARIO_EXPIRED',
  );
});

test('scenario integrity is verified before replay and tampering fails closed', () => {
  const scenario = createTwinScenario(baseScenario());
  assert.equal(verifyTwinScenario(scenario), true);
  const tampered = { ...scenario, model_version: 'tampered/model' };
  assert.throws(
    () => verifyTwinScenario(tampered),
    (error) => error?.code === 'AION_TWIN_INTEGRITY_INVALID',
  );
  assert.throws(
    () => replayCounterfactual(baseReplay(tampered)),
    (error) => error?.code === 'AION_TWIN_INTEGRITY_INVALID',
  );
});

test('counterfactual replay is sealed and can never claim production fact status', () => {
  const scenario = createTwinScenario(baseScenario());
  const replay = replayCounterfactual(baseReplay(scenario));
  assert.equal(replay.schema_version, 'TIGER-AION-TWIN-REPLAY-1');
  assert.equal(replay.fact_class, 'SIMULATION');
  assert.equal(replay.production_write_capability, false);
  assert.equal(replay.scenario_digest, scenario.content_digest);
  assert.match(replay.content_digest, /^[a-f0-9]{64}$/);
  assert.equal(Object.isFrozen(replay), true);
});

test('counterfactual interventions reject production targets and write capabilities', () => {
  const scenario = createTwinScenario(baseScenario());
  for (const interventions of [
    [{ id: 'bad-target', type: 'DATABASE_WRITE', target: 'PRODUCTION', mode: 'SIMULATE' }],
    [{ id: 'bad-mode', type: 'RELEASE_ROUTE', target: 'SHADOW', mode: 'EXECUTE' }],
    [{ id: 'bad-capability', type: 'SECURITY_POLICY', target: 'ISOLATED_TWIN', mode: 'SIMULATE', production_write_capability: true }],
  ]) {
    assert.throws(
      () => replayCounterfactual(baseReplay(scenario, { interventions })),
      (error) => error?.code === 'AION_TWIN_ISOLATION_VIOLATION',
    );
  }
});

test('scenario digests are deterministic across assumption ordering', () => {
  const a = createTwinScenario(baseScenario({
    assumptions: [
      { id: 'candidate-release', value: 'release-candidate-001' },
      { id: 'traffic-multiplier', value: 2 },
    ],
  }));
  const b = createTwinScenario(baseScenario({
    assumptions: [
      { id: 'traffic-multiplier', value: 2 },
      { id: 'candidate-release', value: 'release-candidate-001' },
    ],
  }));
  assert.equal(a.content_digest, b.content_digest);
});

test('invalid twin class, stale timestamps, and malformed release identity fail closed', () => {
  assert.throws(
    () => createTwinScenario(baseScenario({ twin_class: 'POPULATION' })),
    (error) => error?.code === 'AION_TWIN_CLASS_INVALID',
  );
  assert.throws(
    () => createTwinScenario(baseScenario({ expires_at: '2026-08-25T14:29:59.000Z' })),
    (error) => error?.code === 'AION_TWIN_INVALID',
  );
  assert.throws(
    () => createTwinScenario(baseScenario({ source_release_sha: 'not-a-sha' })),
    (error) => error?.code === 'AION_TWIN_INVALID',
  );
});
