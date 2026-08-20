import test from 'node:test';
import assert from 'node:assert/strict';

import { createNetworkBrain } from '../scripts/network/vvip-network-brain.js';
import {
  createMemoryMutationRepository,
  createMutationJournal
} from '../scripts/network/vvip-mutation-journal.js';
import {
  createMemoryCursorStore,
  createReconciliationEngine
} from '../scripts/network/vvip-reconciliation-engine.js';

test('measured latency and jitter degrade network state without inventing packet loss', () => {
  const brain = createNetworkBrain({ online: true, windowSize: 5 });
  for (const durationMs of [90, 850, 120, 1100, 200]) {
    brain.recordRequest({ durationMs, outcome: 'success' });
  }
  const snapshot = brain.snapshot();
  assert.equal(snapshot.state, 'GOOD');
  assert.equal(snapshot.metrics.rttMs, 200);
  assert.equal(Object.hasOwn(snapshot.metrics, 'packetLoss'), false);
});

test('timeouts, offline transition, and reconnect recovery are explicit', () => {
  const brain = createNetworkBrain({ online: true, recoverySuccesses: 2 });
  brain.recordRequest({ durationMs: 3000, outcome: 'timeout' });
  assert.equal(brain.snapshot().state, 'POOR');
  brain.updateConnectivity(false);
  assert.equal(brain.snapshot().state, 'OFFLINE');
  brain.updateConnectivity(true);
  assert.equal(brain.snapshot().state, 'RECOVERING');
  brain.recordRequest({ durationMs: 100, outcome: 'success' });
  brain.recordRequest({ durationMs: 110, outcome: 'success' });
  assert.equal(brain.snapshot().state, 'POOR');
  for (let index = 0; index < 18; index += 1) {
    brain.recordRequest({ durationMs: 100, outcome: 'success' });
  }
  assert.equal(brain.snapshot().state, 'EXCELLENT');
});

test('reordered duplicate events and stale cursor catch-up converge deterministically', async () => {
  const cursorStore = createMemoryCursorStore();
  await cursorStore.set('user_alice', 'social', 'stale-cursor');
  const calls = [];
  const applied = [];
  const engine = createReconciliationEngine({
    journal: createMutationJournal({ repository: createMemoryMutationRepository() }),
    network: { snapshot: () => ({ state: 'DEGRADED' }) },
    cursorStore,
    applyEvent: async (event) => applied.push(event.eventId),
    transport: {
      catchUp: async (request) => {
        calls.push(request);
        return {
          events: [
            { eventId: 'event-3', sequence: 3 },
            { eventId: 'event-2', sequence: 2 },
            { eventId: 'event-3', sequence: 3 }
          ],
          nextCursor: 'cursor-3'
        };
      },
      mutate: async () => ({ status: 'ACK' })
    }
  });

  await engine.reconcile({ actorId: 'user_alice', stream: 'social' });
  assert.equal(calls[0].cursor, 'stale-cursor');
  assert.deepEqual(applied, ['event-2', 'event-3']);
  assert.equal(await cursorStore.get('user_alice', 'social'), 'cursor-3');
});

test('duplicate mutation replay after restart remains idempotent by stable identity', async () => {
  const repository = createMemoryMutationRepository();
  const journal = createMutationJournal({ repository, clock: () => 1000 });
  await journal.enqueue({
    mutationId: 'mutation-chaos-001',
    idempotencyKey: 'idem-chaos-001',
    actorId: 'user_alice',
    kind: 'social.message.send',
    payload: { body: 'once' }
  });
  const identities = [];
  const engine = createReconciliationEngine({
    journal: createMutationJournal({ repository, clock: () => 5000 }),
    network: { snapshot: () => ({ state: 'GOOD' }) },
    cursorStore: createMemoryCursorStore(),
    applyEvent: async () => {},
    transport: {
      catchUp: async () => ({ events: [], nextCursor: null }),
      mutate: async (mutation) => {
        identities.push([mutation.mutationId, mutation.idempotencyKey]);
        return { status: 'CONFLICT', server: { idempotencyMatched: true, payloadMatched: true } };
      }
    }
  });

  await engine.reconcile({ actorId: 'user_alice', stream: 'messages' });
  await engine.reconcile({ actorId: 'user_alice', stream: 'messages' });
  assert.deepEqual(identities, [['mutation-chaos-001', 'idem-chaos-001']]);
  assert.equal((await repository.get('mutation-chaos-001')).state, 'ACKED');
});