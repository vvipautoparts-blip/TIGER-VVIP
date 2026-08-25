import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ALLOWED_EDGE_TYPES,
  ALLOWED_FACT_CLASSES,
  ALLOWED_SIGNAL_TYPES,
  createEvidenceEnvelope,
  createProofGraph,
  digestProofGraph,
  isEvidenceFresh,
} from '../aion/sensory-proof-graph.mjs';

const baseEvidence = (overrides = {}) => ({
  evidence_id: 'ev-db-001',
  signal_type: 'DATABASE',
  fact_class: 'PRODUCTION_FACT',
  occurred_at: '2026-08-25T13:20:00.000Z',
  observed_at: '2026-08-25T13:20:01.000Z',
  expires_at: '2026-08-25T13:25:01.000Z',
  authoritative_source: true,
  source: {
    system: 'supabase-postgres',
    component: 'primary',
    instance: 'db-primary',
    region: 'eu-central',
    release_sha: '26f477afe649e98009f0c4828260a4952b1ef3bc',
  },
  subject: { type: 'database', id: 'primary' },
  correlation: {
    trace_id: '4bf92f3577b34da6a3ce929d0e0e4736',
    request_id: 'req-001',
    release_sha: '26f477afe649e98009f0c4828260a4952b1ef3bc',
  },
  sensitivity: 'INTERNAL',
  attributes: {
    metric_name: 'postgres_connections_active',
    value: 42,
    unit: 'connections',
  },
  ...overrides,
});

test('exports the A1 signal, fact, and edge vocabularies', () => {
  assert.deepEqual([...ALLOWED_SIGNAL_TYPES].sort(), [
    'BUSINESS', 'COST', 'DATABASE', 'FRAUD', 'KERNEL', 'LOG', 'METRIC',
    'NETWORK', 'PROFILE', 'RELEASE', 'RUM', 'SECURITY', 'TRACE',
  ].sort());
  assert.deepEqual([...ALLOWED_FACT_CLASSES].sort(), [
    'DERIVED_HYPOTHESIS', 'PRODUCTION_FACT', 'SIMULATION',
  ].sort());
  assert.deepEqual([...ALLOWED_EDGE_TYPES].sort(), [
    'AFFECTS', 'CAUSED_BY_CANDIDATE', 'CORRELATES_WITH', 'DERIVED_FROM',
    'EMITTED_BY', 'OBSERVED_DURING', 'USES_RELEASE', 'VERIFIES',
  ].sort());
});

test('creates bounded production database evidence without storing raw secret material', () => {
  const envelope = createEvidenceEnvelope(baseEvidence());
  assert.equal(envelope.schema_version, 'TIGER-AION-EVIDENCE-1');
  assert.equal(envelope.evidence_id, 'ev-db-001');
  assert.equal(envelope.signal_type, 'DATABASE');
  assert.equal(envelope.fact_class, 'PRODUCTION_FACT');
  assert.equal(envelope.source.release_sha, '26f477afe649e98009f0c4828260a4952b1ef3bc');
  assert.equal(envelope.attributes.value, 42);
  assert.match(envelope.content_digest, /^[a-f0-9]{64}$/);
  assert.equal(Object.hasOwn(envelope, 'authoritative_source'), false);
});

test('simulation evidence can never silently become a production fact', () => {
  const envelope = createEvidenceEnvelope(baseEvidence({
    evidence_id: 'ev-sim-001',
    fact_class: 'SIMULATION',
    authoritative_source: false,
    source: { system: 'aion-twin', component: 'database-twin' },
    subject: { type: 'simulation', id: 'scenario-001' },
    correlation: { incident_id: 'sim-incident-001' },
  }));
  assert.equal(envelope.fact_class, 'SIMULATION');
  assert.equal(envelope.source.system, 'aion-twin');
});

test('PRODUCTION_FACT fails closed without an authoritative source assertion', () => {
  assert.throws(
    () => createEvidenceEnvelope(baseEvidence({ authoritative_source: false })),
    (error) => error?.code === 'AION_EVIDENCE_INVALID',
  );
});

test('freshness is deterministic and uses the injected clock value', () => {
  const envelope = createEvidenceEnvelope(baseEvidence());
  assert.equal(isEvidenceFresh(envelope, Date.parse('2026-08-25T13:24:59.000Z')), true);
  assert.equal(isEvidenceFresh(envelope, Date.parse('2026-08-25T13:25:02.000Z')), false);
});

test('secret-bearing attribute keys fail closed', () => {
  for (const attributes of [
    { api_key: 'not-even-a-real-key' },
    { refreshToken: 'opaque-value' },
    { Authorization: 'safe-looking-but-forbidden' },
    { nested: { private_key: 'forbidden' } },
  ]) {
    assert.throws(
      () => createEvidenceEnvelope(baseEvidence({ attributes })),
      (error) => error?.code === 'AION_SECRET_MATERIAL_REJECTED',
    );
  }
});

test('secret-like attribute values fail closed even under innocent keys', () => {
  for (const value of [
    'Bearer abcdefghijklmnopqrstuvwxyz0123456789',
    'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyLTEifQ.signature012345678901234',
    '-----BEGIN PRIVATE KEY-----',
  ]) {
    assert.throws(
      () => createEvidenceEnvelope(baseEvidence({ attributes: { note: value } })),
      (error) => error?.code === 'AION_SECRET_MATERIAL_REJECTED',
    );
  }
});

test('invalid signal, fact class, and timestamps fail closed with typed errors', () => {
  assert.throws(
    () => createEvidenceEnvelope(baseEvidence({ signal_type: 'MAGIC' })),
    (error) => error?.code === 'AION_SIGNAL_TYPE_INVALID',
  );
  assert.throws(
    () => createEvidenceEnvelope(baseEvidence({ fact_class: 'MAYBE' })),
    (error) => error?.code === 'AION_FACT_CLASS_INVALID',
  );
  assert.throws(
    () => createEvidenceEnvelope(baseEvidence({ occurred_at: 'not-a-time' })),
    (error) => error?.code === 'AION_TIMESTAMP_INVALID',
  );
});

test('proof graph rejects duplicate nodes and dangling edges', () => {
  const a = createEvidenceEnvelope(baseEvidence());
  const b = createEvidenceEnvelope(baseEvidence({
    evidence_id: 'ev-release-001',
    signal_type: 'RELEASE',
    occurred_at: '2026-08-25T13:19:00.000Z',
    observed_at: '2026-08-25T13:19:01.000Z',
    expires_at: '2026-08-25T14:19:01.000Z',
    source: { system: 'github-actions', component: 'quality-gate', release_sha: '26f477afe649e98009f0c4828260a4952b1ef3bc' },
    subject: { type: 'release', id: '26f477a' },
    correlation: { release_sha: '26f477afe649e98009f0c4828260a4952b1ef3bc' },
    attributes: { gate: 'VVIP_QUALITY_GATE', conclusion: 'success' },
  }));

  assert.throws(
    () => createProofGraph({ nodes: [a, a], edges: [] }),
    (error) => error?.code === 'AION_GRAPH_DUPLICATE_ID',
  );
  assert.throws(
    () => createProofGraph({
      nodes: [a, b],
      edges: [{ edge_id: 'edge-001', type: 'USES_RELEASE', from: a.evidence_id, to: 'missing-node' }],
    }),
    (error) => error?.code === 'AION_GRAPH_DANGLING_EDGE',
  );
});

test('proof graph digest is deterministic across node and edge input ordering', () => {
  const db = createEvidenceEnvelope(baseEvidence());
  const release = createEvidenceEnvelope(baseEvidence({
    evidence_id: 'ev-release-001',
    signal_type: 'RELEASE',
    occurred_at: '2026-08-25T13:19:00.000Z',
    observed_at: '2026-08-25T13:19:01.000Z',
    expires_at: '2026-08-25T14:19:01.000Z',
    source: { system: 'github-actions', component: 'quality-gate', release_sha: '26f477afe649e98009f0c4828260a4952b1ef3bc' },
    subject: { type: 'release', id: '26f477a' },
    correlation: { release_sha: '26f477afe649e98009f0c4828260a4952b1ef3bc' },
    attributes: { gate: 'VVIP_QUALITY_GATE', conclusion: 'success' },
  }));
  const security = createEvidenceEnvelope(baseEvidence({
    evidence_id: 'ev-security-001',
    signal_type: 'SECURITY',
    occurred_at: '2026-08-25T13:20:02.000Z',
    observed_at: '2026-08-25T13:20:03.000Z',
    expires_at: '2026-08-25T13:30:03.000Z',
    source: { system: 'runtime-security', component: 'policy-engine' },
    subject: { type: 'process', id: 'runtime-001' },
    correlation: { trace_id: '4bf92f3577b34da6a3ce929d0e0e4736' },
    attributes: { decision: 'allow', policy: 'baseline' },
  }));
  const edges = [
    { edge_id: 'edge-001', type: 'USES_RELEASE', from: db.evidence_id, to: release.evidence_id },
    { edge_id: 'edge-002', type: 'CORRELATES_WITH', from: security.evidence_id, to: db.evidence_id },
  ];

  const graphA = createProofGraph({ nodes: [db, release, security], edges });
  const graphB = createProofGraph({ nodes: [security, db, release], edges: [...edges].reverse() });
  assert.equal(digestProofGraph(graphA), digestProofGraph(graphB));
  assert.match(digestProofGraph(graphA), /^[a-f0-9]{64}$/);
});
