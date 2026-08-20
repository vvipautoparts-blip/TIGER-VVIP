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

test('concurrent enqueue claims one actor idempotency key atomically', async () => {
  const repository = createMemoryMutationRepository();
  const first = createMutationJournal({ repository, clock: () => 1000 });
  const second = createMutationJournal({ repository, clock: () => 1000 });
  const common = {
    idempotencyKey: 'idem-concurrent-001',
    actorId: 'user_alice',
    kind: 'social.reaction.set',
    payload: { postId: 'post-1', reaction: 'like' }
  };

  const results = await Promise.allSettled([
    first.enqueue({ ...common, mutationId: 'mutation-concurrent-001' }),
    second.enqueue({ ...common, mutationId: 'mutation-concurrent-002' })
  ]);

  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal(results.filter((result) => result.status === 'rejected').length, 1);
  assert.match(results.find((result) => result.status === 'rejected').reason.message, /MUTATION_IDEMPOTENCY_CONFLICT/);
  assert.equal((await repository.list('user_alice')).length, 1);
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

test('SQLite-compatible claim is one atomic conflict-returning statement', async () => {
  const queries = [];
  const record = {
    mutationId: 'mutation-sqlite-001',
    idempotencyKey: 'idem-sqlite-001',
    actorId: 'user_alice',
    kind: 'social.message.send',
    payload: { body: 'hello' },
    payloadSignature: '{"body":"hello"}',
    state: 'LOCAL_PENDING',
    attempts: 0,
    nextAttemptAt: null,
    createdAt: 1000,
    updatedAt: 1000
  };
  const repository = createSqliteMutationRepository({
    execute: async () => {},
    query: async (sql, parameters) => {
      queries.push({ sql, parameters });
      return [{ record_json: JSON.stringify(record) }];
    }
  });

  assert.deepEqual(await repository.claim(record), record);
  assert.equal(queries.length, 1);
  assert.match(queries[0].sql, /on\s+conflict\s*\(actor_id,\s*idempotency_key\)\s+do\s+update/i);
  assert.match(queries[0].sql, /returning\s+record_json/i);
});