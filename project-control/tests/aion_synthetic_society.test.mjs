import test from 'node:test';
import assert from 'node:assert/strict';

import {
  OUTCOME_DIMENSIONS,
  PERSONA_CLASSES,
  createSyntheticCohort,
  createSyntheticJourney,
  createSyntheticPersona,
  evaluateSyntheticSocietyGate,
  verifySyntheticPersona,
} from '../aion/synthetic-society.mjs';

const basePersona = (overrides = {}) => ({
  persona_id: 'persona-normal-001',
  persona_class: 'NORMAL',
  synthetic: true,
  model_version: 'synthetic-society/1',
  traits: {
    network_class: 'broadband',
    device_class: 'midrange',
    locale_class: 'synthetic-global',
    accessibility_mode: 'standard',
    behavior_intensity: 2,
  },
  ...overrides,
});

const baseJourney = (persona, overrides = {}) => ({
  journey_id: 'journey-normal-001',
  persona,
  scenario_ref: 'scenario:release-001',
  scenario_digest: 'a'.repeat(64),
  created_at: '2026-08-25T15:00:00.000Z',
  expires_at: '2026-08-25T16:00:00.000Z',
  execution_target: 'ISOLATED_TWIN',
  production_write_capability: false,
  steps: [
    { id: 'step-1', action: 'REGISTER', mode: 'SIMULATE' },
    { id: 'step-2', action: 'READ_FEED', mode: 'SIMULATE' },
  ],
  ...overrides,
});

const allPassDecisions = () => OUTCOME_DIMENSIONS.map((dimension) => ({
  dimension,
  decision: 'PASS',
  evidence_refs: [`evidence:${dimension.toLowerCase()}-001`],
  policy_ref: `policy:${dimension.toLowerCase()}-1`,
  ...(dimension === 'LEGAL' ? { human_approved: true } : {}),
}));

test('exports the six A4 persona classes and six release dimensions', () => {
  assert.deepEqual([...PERSONA_CLASSES].sort(), [
    'ABUSIVE', 'CONSTRAINED_DEVICE', 'COORDINATED', 'FRAUD', 'NORMAL', 'SPAM',
  ]);
  assert.deepEqual([...OUTCOME_DIMENSIONS].sort(), [
    'ECONOMIC', 'HUMAN', 'LEGAL', 'SECURITY', 'SOCIAL', 'TECHNICAL',
  ]);
});

test('creates sealed synthetic personas for every required behavior class', () => {
  for (const personaClass of PERSONA_CLASSES) {
    const persona = createSyntheticPersona(basePersona({
      persona_id: `persona-${personaClass.toLowerCase()}-001`,
      persona_class: personaClass,
    }));
    assert.equal(persona.synthetic, true);
    assert.equal(persona.persona_class, personaClass);
    assert.match(persona.content_digest, /^[a-f0-9]{64}$/);
    assert.equal(Object.isFrozen(persona), true);
    assert.equal(verifySyntheticPersona(persona), true);
  }
});

test('rejects any attempt to bind a synthetic persona to real-person or production-account identity', () => {
  for (const traits of [
    { email: 'synthetic.invalid' },
    { phone: '0000000000' },
    { real_name: 'synthetic-label' },
    { ip_address: '192.0.2.1' },
    { production_user_id: 'user-001' },
    { account_id: 'account-001' },
  ]) {
    assert.throws(
      () => createSyntheticPersona(basePersona({ traits })),
      (error) => error?.code === 'AION_SOCIETY_IDENTITY_MATERIAL_REJECTED',
    );
  }
});

test('rejects secret-like persona material and non-synthetic identity mode', () => {
  const privateMarker = ['-----BEGIN', ' PRIVATE KEY-----'].join('');
  assert.throws(
    () => createSyntheticPersona(basePersona({ synthetic: false })),
    (error) => error?.code === 'AION_SOCIETY_IDENTITY_MATERIAL_REJECTED',
  );
  assert.throws(
    () => createSyntheticPersona(basePersona({ traits: { credential: 'opaque' } })),
    (error) => error?.code === 'AION_SOCIETY_SECRET_MATERIAL_REJECTED',
  );
  assert.throws(
    () => createSyntheticPersona(basePersona({ traits: { harmless: privateMarker } })),
    (error) => error?.code === 'AION_SOCIETY_SECRET_MATERIAL_REJECTED',
  );
});

test('journeys remain simulation-only and isolated from Production', () => {
  const persona = createSyntheticPersona(basePersona());
  const journey = createSyntheticJourney(baseJourney(persona));
  assert.equal(journey.schema_version, 'TIGER-AION-SYNTHETIC-JOURNEY-1');
  assert.equal(journey.fact_class, 'SIMULATION');
  assert.equal(journey.synthetic, true);
  assert.equal(journey.production_write_capability, false);
  assert.equal(journey.execution_target, 'ISOLATED_TWIN');
  assert.equal(journey.persona_digest, persona.content_digest);
  assert.match(journey.content_digest, /^[a-f0-9]{64}$/);
});

test('journeys reject production targets, execute mode, and tampered personas', () => {
  const persona = createSyntheticPersona(basePersona());
  const tamperedPersona = { ...persona, persona_class: 'FRAUD' };
  for (const input of [
    baseJourney(persona, { execution_target: 'PRODUCTION' }),
    baseJourney(persona, { production_write_capability: true }),
    baseJourney(persona, { steps: [{ id: 'step-1', action: 'REGISTER', mode: 'EXECUTE' }] }),
  ]) {
    assert.throws(
      () => createSyntheticJourney(input),
      (error) => error?.code === 'AION_SOCIETY_ISOLATION_VIOLATION',
    );
  }
  assert.throws(
    () => createSyntheticJourney(baseJourney(tamperedPersona)),
    (error) => error?.code === 'AION_SOCIETY_INTEGRITY_INVALID',
  );
});

test('coordinated cohorts contain only verified synthetic personas and are deterministic', () => {
  const normal = createSyntheticPersona(basePersona());
  const fraud = createSyntheticPersona(basePersona({ persona_id: 'persona-fraud-001', persona_class: 'FRAUD' }));
  const a = createSyntheticCohort({
    cohort_id: 'cohort-coordinated-001',
    model_version: 'synthetic-cohort/1',
    members: [normal, fraud],
  });
  const b = createSyntheticCohort({
    cohort_id: 'cohort-coordinated-001',
    model_version: 'synthetic-cohort/1',
    members: [fraud, normal],
  });
  assert.equal(a.synthetic, true);
  assert.equal(a.coordination_mode, 'SYNTHETIC');
  assert.equal(a.content_digest, b.content_digest);
});

test('six-dimensional gate approves only when all required dimensions pass', () => {
  const result = evaluateSyntheticSocietyGate({
    gate_id: 'gate-release-001',
    release_ref: 'release:candidate-001',
    decisions: allPassDecisions(),
  });
  assert.equal(result.schema_version, 'TIGER-AION-SOCIETY-GATE-1');
  assert.equal(result.status, 'APPROVED');
  assert.equal(result.dimensions.length, 6);
  assert.match(result.content_digest, /^[a-f0-9]{64}$/);
});

test('any failed dimension rejects and any hold prevents approval', () => {
  const failed = allPassDecisions().map((item) => item.dimension === 'SOCIAL' ? { ...item, decision: 'FAIL' } : item);
  const held = allPassDecisions().map((item) => item.dimension === 'ECONOMIC' ? { ...item, decision: 'HOLD' } : item);
  assert.equal(evaluateSyntheticSocietyGate({ gate_id: 'gate-fail', release_ref: 'release:1', decisions: failed }).status, 'REJECTED');
  assert.equal(evaluateSyntheticSocietyGate({ gate_id: 'gate-hold', release_ref: 'release:1', decisions: held }).status, 'HOLD');
});

test('missing or duplicate release dimensions fail closed', () => {
  assert.throws(
    () => evaluateSyntheticSocietyGate({
      gate_id: 'gate-missing',
      release_ref: 'release:1',
      decisions: allPassDecisions().filter((item) => item.dimension !== 'HUMAN'),
    }),
    (error) => error?.code === 'AION_SOCIETY_GATE_INVALID',
  );
  const duplicate = [...allPassDecisions(), { ...allPassDecisions()[0] }];
  assert.throws(
    () => evaluateSyntheticSocietyGate({ gate_id: 'gate-duplicate', release_ref: 'release:1', decisions: duplicate }),
    (error) => error?.code === 'AION_SOCIETY_GATE_INVALID',
  );
});

test('LEGAL dimension requires explicit human approval even when its decision says PASS', () => {
  const decisions = allPassDecisions().map((item) => item.dimension === 'LEGAL'
    ? { ...item, human_approved: false }
    : item);
  assert.throws(
    () => evaluateSyntheticSocietyGate({ gate_id: 'gate-legal', release_ref: 'release:1', decisions }),
    (error) => error?.code === 'AION_SOCIETY_LEGAL_APPROVAL_REQUIRED',
  );
});
