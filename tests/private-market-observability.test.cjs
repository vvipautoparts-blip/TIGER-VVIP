'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { createMarketObservabilityAuthority } = require('../scripts/marketplace/market-observability.js');

const NOW = '2026-08-23T13:10:00.000Z';

function telemetry() {
  return createMarketObservabilityAuthority({ now: () => NOW });
}

test('records an immutable allowlisted Market Genesis operational event with server time', () => {
  const authority = telemetry();
  const result = authority.record({
    event_type: 'market_genesis.compiled',
    request_id: 'req_001',
    generation_id: 'gen_001',
    sector_id: 'automotive',
    country: 'JO',
    policy_version: 'policy-2026-08',
    physics_version: '1.0.0',
    compiler_version: 'market-genesis-1',
    placement_class: 'ORGANIC',
    sponsored: false,
    candidate_count: 12,
    result_count: 4,
    latency_ms: 18,
  });

  assert.equal(result.ok, true, result.errors && result.errors.join(', '));
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.event), true);
  assert.equal(result.event.event_type, 'market_genesis.compiled');
  assert.equal(result.event.occurred_at, NOW);
  assert.equal(result.event.request_id, 'req_001');
  assert.equal(result.event.candidate_count, 12);
  assert.equal(result.event.result_count, 4);
});

test('fails closed when telemetry contains raw intent, direct PII, message/group state, secrets, or transaction fields', () => {
  const forbiddenCases = [
    ['raw_intent', 'private search intent'],
    ['intent_text', 'find me a hidden offer'],
    ['intent_embedding', [0.1, 0.2]],
    ['email', 'seller@example.com'],
    ['phone', '+962000000000'],
    ['message_body', 'negotiate here'],
    ['group_id', 'group_1'],
    ['contact_token', 'reusable-contact-secret'],
    ['api_key', 'secret'],
    ['checkout', { amount: 100 }],
    ['order', { id: 'order_1' }],
    ['payment_intent', { amount: 100 }],
    ['deal_status', 'CLOSED'],
  ];

  for (const [field, value] of forbiddenCases) {
    const result = telemetry().record({
      event_type: 'market_genesis.compiled',
      request_id: 'req_private',
      [field]: value,
    });
    assert.equal(result.ok, false, `${field} must fail closed`);
    assert.ok(result.reason_codes.includes('OBSERVABILITY_PRIVATE_OR_TRANSACTION_FIELD_FORBIDDEN'));
  }

  const nested = telemetry().record({
    event_type: 'market_genesis.compiled',
    request_id: 'req_nested',
    metadata: { nested: { email: 'seller@example.com' } },
  });
  assert.equal(nested.ok, false);
  assert.ok(nested.reason_codes.includes('OBSERVABILITY_PRIVATE_OR_TRANSACTION_FIELD_FORBIDDEN'));
});

test('rejects unknown operational fields rather than silently logging arbitrary metadata', () => {
  const result = telemetry().record({
    event_type: 'market_genesis.requested',
    request_id: 'req_unknown',
    arbitrary_payload: 'not allowlisted',
  });

  assert.equal(result.ok, false);
  assert.ok(result.reason_codes.includes('OBSERVABILITY_FIELD_NOT_ALLOWLISTED'));
});

test('rejects transaction lifecycle event names even when their payload is otherwise small', () => {
  for (const eventType of [
    'marketplace.transaction_completed',
    'marketplace.payment_captured',
    'marketplace.delivery_completed',
    'marketplace.ownership_transferred',
  ]) {
    const result = telemetry().record({ event_type: eventType, request_id: 'req_forbidden_type' });
    assert.equal(result.ok, false, `${eventType} must be rejected`);
    assert.ok(result.reason_codes.includes('OBSERVABILITY_EVENT_TYPE_FORBIDDEN'));
  }
});

test('supports the canonical Market Genesis audit event vocabulary and counts policy, vehicle, and handoff outcomes', () => {
  const authority = telemetry();
  const eventTypes = [
    'market_genesis.requested',
    'market_genesis.compiled',
    'market_genesis.policy_denied',
    'ad_genome.created',
    'ad_genome.validated',
    'ad_genome.published',
    'ad_genome.rejected',
    'ad_genome.expired',
    'sector_physics.activated',
    'contact.requested',
    'contact.authorized',
    'handoff.emitted',
    'automotive.whole_vehicle_rejected',
  ];

  for (const [index, eventType] of eventTypes.entries()) {
    const result = authority.record({
      event_type: eventType,
      request_id: `req_${index}`,
      sector_id: eventType.startsWith('automotive.') ? 'automotive' : 'real-estate',
      policy_version: 'policy-2026-08',
      physics_version: '1.0.0',
      reason_codes: eventType === 'market_genesis.policy_denied'
        ? ['POLICY_VERSION_MISMATCH']
        : eventType === 'automotive.whole_vehicle_rejected'
          ? ['WHOLE_VEHICLE_FORBIDDEN']
          : [],
    });
    assert.equal(result.ok, true, `${eventType}: ${result.errors && result.errors.join(', ')}`);
  }

  const metrics = authority.snapshotMetrics();
  assert.equal(Object.isFrozen(metrics), true);
  assert.equal(Object.isFrozen(metrics.events_by_type), true);
  assert.equal(metrics.events_total, eventTypes.length);
  assert.equal(metrics.events_by_type['market_genesis.compiled'], 1);
  assert.equal(metrics.events_by_type['automotive.whole_vehicle_rejected'], 1);
  assert.equal(metrics.policy_denials, 1);
  assert.equal(metrics.whole_vehicle_rejections, 1);
  assert.equal(metrics.handoffs, 1);
});

test('metrics contain aggregates only and never copy opaque event identifiers or payload content', () => {
  const authority = telemetry();
  const result = authority.record({
    event_type: 'market_genesis.compiled',
    request_id: 'req_sensitive_ref',
    generation_id: 'gen_sensitive_ref',
    ad_id: 'ad_sensitive_ref',
    sector_id: 'automotive',
    policy_version: 'policy-2026-08',
    physics_version: '1.0.0',
    latency_ms: 21,
  });
  assert.equal(result.ok, true);

  const metrics = authority.snapshotMetrics();
  assert.equal(metrics.latency_ms_total, 21);
  assert.equal(metrics.latency_samples, 1);
  const serialized = JSON.stringify(metrics);
  assert.equal(serialized.includes('req_sensitive_ref'), false);
  assert.equal(serialized.includes('gen_sensitive_ref'), false);
  assert.equal(serialized.includes('ad_sensitive_ref'), false);
});

test('handoff telemetry can record the terminal boundary but cannot carry message or deal state', () => {
  const authority = telemetry();
  const accepted = authority.record({
    event_type: 'handoff.emitted',
    request_id: 'req_handoff',
    ad_id: 'ad_001',
    sector_id: 'automotive',
    country: 'JO',
    policy_version: 'policy-2026-08',
    physics_version: '1.0.0',
    state: 'HANDOFF_EMITTED',
    terminal_state: 'TIGER_MARKET_ROLE_ENDED',
  });
  assert.equal(accepted.ok, true);

  const denied = authority.record({
    event_type: 'handoff.emitted',
    request_id: 'req_handoff_private',
    message_content: 'continue bargaining',
    deal_status: 'AGREED',
  });
  assert.equal(denied.ok, false);
  assert.ok(denied.reason_codes.includes('OBSERVABILITY_PRIVATE_OR_TRANSACTION_FIELD_FORBIDDEN'));
});
