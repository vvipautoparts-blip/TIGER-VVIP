import { resolveMutationConflict } from './vvip-conflict-engine.js';

const MAX_ATTEMPTS = 5;
const MAX_BACKOFF_MS = 30000;

function validateDependencies({ journal, network, transport, cursorStore, applyEvent }) {
  if (!journal || typeof journal.pending !== 'function' || typeof journal.transition !== 'function') {
    throw new TypeError('RECONCILIATION_JOURNAL_INVALID');
  }
  if (!network || typeof network.snapshot !== 'function') throw new TypeError('RECONCILIATION_NETWORK_INVALID');
  if (!transport || typeof transport.catchUp !== 'function' || typeof transport.mutate !== 'function') {
    throw new TypeError('RECONCILIATION_TRANSPORT_INVALID');
  }
  if (!cursorStore || typeof cursorStore.get !== 'function' || typeof cursorStore.set !== 'function') {
    throw new TypeError('RECONCILIATION_CURSOR_STORE_INVALID');
  }
  if (typeof applyEvent !== 'function') throw new TypeError('RECONCILIATION_EVENT_SINK_INVALID');
}

function orderedUniqueEvents(events) {
  if (!Array.isArray(events)) throw new Error('RECONCILIATION_EVENTS_INVALID');
  const unique = new Map();
  for (const event of events) {
    if (!event || typeof event.eventId !== 'string' || !Number.isSafeInteger(event.sequence) || event.sequence < 0) {
      throw new Error('RECONCILIATION_EVENT_INVALID');
    }
    const existing = unique.get(event.eventId);
    if (existing && JSON.stringify(existing) !== JSON.stringify(event)) {
      throw new Error('RECONCILIATION_EVENT_ID_CONFLICT');
    }
    if (!existing) unique.set(event.eventId, event);
  }
  return [...unique.values()].sort(
    (left, right) => left.sequence - right.sequence || left.eventId.localeCompare(right.eventId)
  );
}

function retryAt(attempts, clock, random) {
  const ceiling = Math.min(MAX_BACKOFF_MS, 500 * (2 ** Math.max(0, attempts - 1)));
  const jitter = Math.min(1, Math.max(0, random()));
  return clock() + Math.max(1, Math.round(ceiling * jitter));
}

export function createMemoryCursorStore() {
  const cursors = new Map();
  const key = (actorId, stream) => `${actorId}\u0000${stream}`;
  return Object.freeze({
    async get(actorId, stream) {
      return cursors.get(key(actorId, stream)) ?? null;
    },
    async set(actorId, stream, cursor) {
      cursors.set(key(actorId, stream), cursor);
    }
  });
}

export function createReconciliationEngine({
  journal,
  network,
  transport,
  cursorStore,
  applyEvent,
  resolveConflict = resolveMutationConflict,
  clock = () => Date.now(),
  random = Math.random,
  idFactory = () => crypto.randomUUID()
} = {}) {
  validateDependencies({ journal, network, transport, cursorStore, applyEvent });
  let running = false;

  async function scheduleRetry(record) {
    if (record.attempts >= MAX_ATTEMPTS) {
      await journal.transition(record.mutationId, 'TERMINAL', { terminalCode: 'RETRY_BUDGET_EXHAUSTED' });
      return 'TERMINAL';
    }
    await journal.transition(record.mutationId, 'RETRY_WAIT', {
      nextAttemptAt: retryAt(record.attempts, clock, random)
    });
    return 'RETRY_WAIT';
  }

  async function resolveConflictResponse(record, response) {
    const decision = resolveConflict({
      kind: record.kind,
      base: response.base,
      local: record.payload,
      server: response.server
    });
    if (decision.action === 'ACK') {
      await journal.transition(record.mutationId, 'ACKED');
      return;
    }
    if (decision.action === 'ACCEPT_SERVER') {
      await journal.transition(record.mutationId, 'TERMINAL', { terminalCode: 'SERVER_AUTHORITATIVE' });
      return;
    }
    if (decision.action === 'TERMINAL') {
      await journal.transition(record.mutationId, 'TERMINAL', { terminalCode: decision.policy });
      return;
    }
    if (decision.action === 'RETRY_AS_NEW') {
      await journal.transition(record.mutationId, 'TERMINAL', { terminalCode: 'SUPERSEDED_BY_RECONCILIATION' });
      const identity = idFactory();
      await journal.enqueue({
        mutationId: `mutation-${identity}`,
        idempotencyKey: `idem-${identity}`,
        actorId: record.actorId,
        kind: record.kind,
        payload: decision.payload
      });
      return;
    }
    await journal.transition(record.mutationId, 'CONFLICT', { conflictCode: decision.policy });
  }

  async function replayMutation(record) {
    if (record.state === 'RETRY_WAIT' && record.nextAttemptAt > clock()) return 'DEFERRED';
    const inFlight = await journal.transition(record.mutationId, 'IN_FLIGHT');
    let response;
    try {
      response = await transport.mutate({
        mutationId: inFlight.mutationId,
        idempotencyKey: inFlight.idempotencyKey,
        actorId: inFlight.actorId,
        kind: inFlight.kind,
        payload: inFlight.payload
      });
    } catch (_) {
      return scheduleRetry(inFlight);
    }

    if (response?.status === 'ACK') {
      await journal.transition(inFlight.mutationId, 'ACKED');
      return 'ACKED';
    }
    if (response?.status === 'CONFLICT') {
      await resolveConflictResponse(inFlight, response);
      return 'CONFLICT_RESOLVED';
    }
    if (response?.status === 'TERMINAL') {
      await journal.transition(inFlight.mutationId, 'TERMINAL', { terminalCode: response.code || 'SERVER_REJECTED' });
      return 'TERMINAL';
    }
    return scheduleRetry(inFlight);
  }

  return Object.freeze({
    async reconcile({ actorId, stream }) {
      const state = network.snapshot().state;
      if (state === 'OFFLINE' || state === 'POOR') {
        return Object.freeze({ ok: false, code: 'NETWORK_UNAVAILABLE' });
      }
      if (running) return Object.freeze({ ok: false, code: 'RECONCILIATION_IN_PROGRESS' });
      running = true;
      try {
        const cursor = await cursorStore.get(actorId, stream);
        const delta = await transport.catchUp({ actorId, stream, cursor });
        const events = orderedUniqueEvents(delta?.events || []);
        for (const event of events) await applyEvent(event);
        if (typeof delta?.nextCursor === 'string' && delta.nextCursor) {
          await cursorStore.set(actorId, stream, delta.nextCursor);
        }

        const mutations = await journal.pending({ actorId });
        let mutationsProcessed = 0;
        for (const mutation of mutations) {
          const outcome = await replayMutation(mutation);
          if (outcome !== 'DEFERRED') mutationsProcessed += 1;
        }
        return Object.freeze({
          ok: true,
          eventsApplied: events.length,
          mutationsProcessed
        });
      } finally {
        running = false;
      }
    }
  });
}