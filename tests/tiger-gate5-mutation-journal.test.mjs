import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  MUTATION_STATES,
  createMemoryMutationRepository,
  createMutationJournal,
  createSqliteMutationRepository
} from '../scripts/network/vvip-mutation-journal.js';

const source = () => readFile(
  new URL('../scripts/network/vvip-mutation-journal.js', import.meta.url),
  'utf8'
);

test('mutation journal exposes the six durable Gate 5 states', () => {
  assert.deepEqual(MUTATION_STATES, [
    'LOCAL_PENDING',
    'IN_FLIGHT',
    'ACKED',
    'RETRY_WAIT',
    'CONFLICT',
    'TERMINAL'
  ]);
});

test('pending mutations survive journal restart and remain actor-bound', async () => {
  const repository = createMemoryMutationRepository();
  const first = createMutationJournal({ repository, clock: () => 1000 });

  const enqueued = await first.enqueue({
    mutationId: 'mutation-001',
    idempotencyKey: 'idem-001',
    actorId: 'user_alice',
    kind: 'social.post.create',
    payload: { body: 'offline post' }
  });
  assert.equal(enqueued.state, 'LOCAL_PENDING');

  const restarted = createMutationJournal({ repository, clock: () => 2000 });
  assert.deepEqual(
    await restarted.pending({ actorId: 'user_alice' }),
    [enqueued]
  );
  assert.deepEqual(await restarted.pending({ actorId: 'user_bob' }), []);
});

test('idempotency key reuse is deterministic and conflicting payload reuse fails closed', async () => {
  const journal = createMutationJournal({ repository: createMemoryMutationRepository(), clock: () => 1000 });
  const input = {
    mutationId: 'mutation-001',
    idempotencyKey: 'idem-001',
    actorId: 'user_alice',
    kind: 'social.reaction.set',
    payload: { postId: 'post-1', reaction: 'like' }
  };

  const first = await journal.enqueue(input);
  assert.deepEqual(await journal.enqueue(input), first);
  await assert.rejects(
    journal.enqueue({ ...input, mutationId: 'mutation-002', payload: { postId: 'post-1', reaction: 'love' } }),
    /MUTATION_IDEMPOTENCY_CONFLICT/
  );
});

test('journal enforces state transitions and retains replay identity', async () => {
  const journal = createMutationJournal({ repository: createMemoryMutationRepository(), clock: () => 1000 });
  const pending = await journal.enqueue({
    mutationId: 'mutation-001',
    idempotencyKey: 'idem-001',
    actorId: 'user_alice',
    kind: 'social.message.send',
    payload: { conversationId: 'conversation-1', body: 'hello' }
  });

  const inFlight = await journal.transition(pending.mutationId, 'IN_FLIGHT');
  const retry = await journal.transition(pending.mutationId, 'RETRY_WAIT', { nextAttemptAt: 5000 });
  const replay = await journal.transition(pending.mutationId, 'IN_FLIGHT');
  const acked = await journal.transition(pending.mutationId, 'ACKED');

  assert.equal(inFlight.attempts, 1);
  assert.equal(retry.nextAttemptAt, 5000);
  assert.equal(replay.attempts, 2);
  assert.equal(acked.idempotencyKey, 'idem-001');
  await assert.rejects(journal.transition(pending.mutationId, 'IN_FLIGHT'), /MUTATION_TRANSITION_DENIED/);
});

test('IndexedDB and SQLite-compatible adapters are real persistence boundaries', async () => {
  const text = await source();
  assert.match(text, /indexedDB\.open/);
  assert.match(text, /createObjectStore/);
  assert.match(text, /createSqliteMutationRepository/);

  const statements = [];
  const repository = createSqliteMutationRepository({
    execute: async (sql, parameters) => { statements.push({ sql, parameters }); },
    query: async () => []
  });
  await repository.initialize();
  assert.match(statements[0].sql, /create\s+table\s+if\s+not\s+exists\s+vvip_mutation_journal/i);
  assert.match(statements[0].sql, /idempotency_key\s+text\s+not\s+null/i);
});