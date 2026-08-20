import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createMemoryMutationRepository,
  createMutationJournal
} from '../scripts/network/vvip-mutation-journal.js';
import {
  createMemoryCursorStore,
  createReconciliationEngine
} from '../scripts/network/vvip-reconciliation-engine.js';

async function queuedJournal(repository, clock, kind = 'social.message.send') {
  const journal = createMutationJournal({ repository, clock });
  await journal.enqueue({
    mutationId: 'mutation-001',
    idempotencyKey: 'idem-001',
    actorId: 'user_alice',
    kind,
    payload: { body: 'hello' }
  });
  return journal;
}

test('offline reconciliation performs no transport or mutation transition', async () => {
  const repository = createMemoryMutationRepository();
  const journal = await queuedJournal(repository, () => 1000);
  let calls = 0;
  const engine = createReconciliationEngine({
    journal,
    network: { snapshot: () => ({ state: 'OFFLINE' }) },
    transport: { catchUp: async () => { calls += 1; }, mutate: async () => { calls += 1; } },
    cursorStore: createMemoryCursorStore(),
    applyEvent: async () => {}
  });

  assert.deepEqual(await engine.reconcile({ actorId: 'user_alice', stream: 'social' }), {
    ok: false,
    code: 'NETWORK_UNAVAILABLE'
  });
  assert.equal(calls, 0);
  assert.equal((await repository.get('mutation-001')).state, 'LOCAL_PENDING');
});

test('reconnect catch-up deduplicates reordered events and advances cursor only after apply', async () => {
  const applied = [];
  const cursorStore = createMemoryCursorStore();
  const engine = createReconciliationEngine({
    journal: createMutationJournal({ repository: createMemoryMutationRepository() }),
    network: { snapshot: () => ({ state: 'RECOVERING' }) },
    transport: {
      catchUp: async () => ({
        events: [
          { eventId: 'event-2', sequence: 2 },
          { eventId: 'event-1', sequence: 1 },
          { eventId: 'event-2', sequence: 2 }
        ],
        nextCursor: 'cursor-2'
      }),
      mutate: async () => ({ status: 'ACK' })
    },
    cursorStore,
    applyEvent: async (event) => applied.push(event.eventId)
  });

  const result = await engine.reconcile({ actorId: 'user_alice', stream: 'social' });
  assert.deepEqual(applied, ['event-1', 'event-2']);
  assert.equal(await cursorStore.get('user_alice', 'social'), 'cursor-2');
  assert.equal(result.eventsApplied, 2);
});

test('timeout retry survives restart and replays the same mutation identity', async () => {
  let now = 1000;
  const repository = createMemoryMutationRepository();
  const firstJournal = await queuedJournal(repository, () => now);
  const attempts = [];
  const base = {
    network: { snapshot: () => ({ state: 'GOOD' }) },
    cursorStore: createMemoryCursorStore(),
    applyEvent: async () => {},
    random: () => 1,
    clock: () => now
  };
  const first = createReconciliationEngine({
    ...base,
    journal: firstJournal,
    transport: {
      catchUp: async () => ({ events: [], nextCursor: null }),
      mutate: async (mutation) => { attempts.push(mutation); throw Object.assign(new Error('timeout'), { code: 'REQUEST_TIMEOUT' }); }
    }
  });

  await first.reconcile({ actorId: 'user_alice', stream: 'social' });
  assert.equal((await repository.get('mutation-001')).state, 'RETRY_WAIT');

  now = 5000;
  const restarted = createReconciliationEngine({
    ...base,
    journal: createMutationJournal({ repository, clock: () => now }),
    transport: {
      catchUp: async () => ({ events: [], nextCursor: null }),
      mutate: async (mutation) => { attempts.push(mutation); return { status: 'ACK' }; }
    }
  });
  await restarted.reconcile({ actorId: 'user_alice', stream: 'social' });

  assert.equal((await repository.get('mutation-001')).state, 'ACKED');
  assert.deepEqual(attempts.map(({ mutationId, idempotencyKey }) => ({ mutationId, idempotencyKey })), [
    { mutationId: 'mutation-001', idempotencyKey: 'idem-001' },
    { mutationId: 'mutation-001', idempotencyKey: 'idem-001' }
  ]);
});

test('Marketplace conflict accepts server authority and never auto-replays a local transition', async () => {
  const repository = createMemoryMutationRepository();
  const journal = await queuedJournal(repository, () => 1000, 'marketplace.listing.transition');
  let mutations = 0;
  const engine = createReconciliationEngine({
    journal,
    network: { snapshot: () => ({ state: 'GOOD' }) },
    transport: {
      catchUp: async () => ({ events: [], nextCursor: null }),
      mutate: async () => { mutations += 1; return { status: 'CONFLICT', server: { state: 'blocked' } }; }
    },
    cursorStore: createMemoryCursorStore(),
    applyEvent: async () => {}
  });

  await engine.reconcile({ actorId: 'user_alice', stream: 'marketplace' });
  const record = await repository.get('mutation-001');
  assert.equal(mutations, 1);
  assert.equal(record.state, 'TERMINAL');
  assert.equal(record.terminalCode, 'SERVER_AUTHORITATIVE');
});