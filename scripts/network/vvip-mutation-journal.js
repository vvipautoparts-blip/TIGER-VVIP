export const MUTATION_STATES = Object.freeze([
  'LOCAL_PENDING',
  'IN_FLIGHT',
  'ACKED',
  'RETRY_WAIT',
  'CONFLICT',
  'TERMINAL'
]);

const ACTIVE_STATES = new Set(['LOCAL_PENDING', 'IN_FLIGHT', 'RETRY_WAIT', 'CONFLICT']);
const TRANSITIONS = Object.freeze({
  LOCAL_PENDING: new Set(['IN_FLIGHT', 'TERMINAL']),
  IN_FLIGHT: new Set(['IN_FLIGHT', 'ACKED', 'RETRY_WAIT', 'CONFLICT', 'TERMINAL']),
  ACKED: new Set(),
  RETRY_WAIT: new Set(['IN_FLIGHT', 'TERMINAL']),
  CONFLICT: new Set(['IN_FLIGHT', 'TERMINAL']),
  TERMINAL: new Set()
});

function clone(value) {
  return typeof structuredClone === 'function'
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
}

function stableSignature(value) {
  return JSON.stringify(stableValue(value));
}

function immutableRecord(value) {
  const payload = Object.freeze(clone(value.payload));
  return Object.freeze({ ...clone(value), payload });
}

function validIdentifier(value, prefix) {
  return typeof value === 'string'
    && value.startsWith(prefix)
    && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value);
}

function validateInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('MUTATION_INPUT_INVALID');
  if (!validIdentifier(input.mutationId, 'mutation-')) throw new TypeError('MUTATION_ID_INVALID');
  if (!validIdentifier(input.idempotencyKey, 'idem-')) throw new TypeError('MUTATION_IDEMPOTENCY_KEY_INVALID');
  if (!validIdentifier(input.actorId, 'user_')) throw new TypeError('MUTATION_ACTOR_INVALID');
  if (typeof input.kind !== 'string' || !/^[a-z][a-z0-9]*(?:\.[a-z][a-z0-9]*)+$/.test(input.kind)) {
    throw new TypeError('MUTATION_KIND_INVALID');
  }
  if (!input.payload || typeof input.payload !== 'object' || Array.isArray(input.payload)) {
    throw new TypeError('MUTATION_PAYLOAD_INVALID');
  }
  const payloadSignature = stableSignature(input.payload);
  if (payloadSignature.length > 65536) throw new TypeError('MUTATION_PAYLOAD_TOO_LARGE');
  return payloadSignature;
}

function requireRepository(repository) {
  for (const method of ['initialize', 'get', 'getByIdempotency', 'claim', 'put', 'list']) {
    if (!repository || typeof repository[method] !== 'function') {
      throw new TypeError('MUTATION_REPOSITORY_INVALID');
    }
  }
}

export function createMutationJournal({ repository, clock = () => Date.now() } = {}) {
  requireRepository(repository);
  let initialized;
  const ready = () => {
    if (!initialized) initialized = Promise.resolve(repository.initialize());
    return initialized;
  };

  return Object.freeze({
    async enqueue(input) {
      const payloadSignature = validateInput(input);
      await ready();
      const timestamp = clock();
      const record = {
        mutationId: input.mutationId,
        idempotencyKey: input.idempotencyKey,
        actorId: input.actorId,
        kind: input.kind,
        payload: clone(input.payload),
        payloadSignature,
        state: 'LOCAL_PENDING',
        attempts: 0,
        nextAttemptAt: null,
        createdAt: timestamp,
        updatedAt: timestamp
      };
      const canonical = await repository.claim(record);
      if (
        canonical.kind !== input.kind
        || canonical.payloadSignature !== payloadSignature
        || canonical.mutationId !== input.mutationId
      ) throw new Error('MUTATION_IDEMPOTENCY_CONFLICT');
      return immutableRecord(canonical);
    },

    async transition(mutationId, nextState, metadata = {}) {
      await ready();
      if (!MUTATION_STATES.includes(nextState)) throw new TypeError('MUTATION_STATE_INVALID');
      const current = await repository.get(mutationId);
      if (!current) throw new Error('MUTATION_NOT_FOUND');
      if (!TRANSITIONS[current.state]?.has(nextState)) throw new Error('MUTATION_TRANSITION_DENIED');
      if (nextState === 'RETRY_WAIT' && (!Number.isFinite(metadata.nextAttemptAt) || metadata.nextAttemptAt <= clock())) {
        throw new TypeError('MUTATION_RETRY_TIME_INVALID');
      }

      const updated = {
        ...current,
        state: nextState,
        attempts: current.attempts + (nextState === 'IN_FLIGHT' ? 1 : 0),
        nextAttemptAt: nextState === 'RETRY_WAIT' ? metadata.nextAttemptAt : null,
        conflictCode: nextState === 'CONFLICT' && typeof metadata.conflictCode === 'string'
          ? metadata.conflictCode.slice(0, 128)
          : null,
        terminalCode: nextState === 'TERMINAL' && typeof metadata.terminalCode === 'string'
          ? metadata.terminalCode.slice(0, 128)
          : null,
        updatedAt: clock()
      };
      await repository.put(updated);
      return immutableRecord(updated);
    },

    async pending({ actorId }) {
      if (!validIdentifier(actorId, 'user_')) throw new TypeError('MUTATION_ACTOR_INVALID');
      await ready();
      const records = await repository.list(actorId);
      return Object.freeze(records
        .filter((record) => ACTIVE_STATES.has(record.state))
        .sort((left, right) => left.createdAt - right.createdAt || left.mutationId.localeCompare(right.mutationId))
        .map(immutableRecord));
    }
  });
}

export function createMemoryMutationRepository() {
  const records = new Map();
  return Object.freeze({
    async initialize() {},
    async get(mutationId) {
      const record = records.get(mutationId);
      return record ? clone(record) : null;
    },
    async getByIdempotency(actorId, idempotencyKey) {
      const record = [...records.values()].find(
        (candidate) => candidate.actorId === actorId && candidate.idempotencyKey === idempotencyKey
      );
      return record ? clone(record) : null;
    },
    async claim(record) {
      const existing = [...records.values()].find(
        (candidate) => candidate.actorId === record.actorId && candidate.idempotencyKey === record.idempotencyKey
      );
      if (existing) return clone(existing);
      if (records.has(record.mutationId)) throw new Error('MUTATION_REPOSITORY_CONFLICT');
      records.set(record.mutationId, clone(record));
      return clone(record);
    },
    async put(record) {
      records.set(record.mutationId, clone(record));
    },
    async list(actorId) {
      return [...records.values()].filter((record) => record.actorId === actorId).map(clone);
    }
  });
}

export function createIndexedDbMutationRepository({
  indexedDB = globalThis.indexedDB,
  databaseName = 'vvip-tiger-network-v1'
} = {}) {
  if (!indexedDB || typeof indexedDB.open !== 'function') throw new TypeError('INDEXEDDB_UNAVAILABLE');
  let databasePromise;

  function database() {
    if (databasePromise) return databasePromise;
    databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(databaseName, 1);
      request.onupgradeneeded = () => {
        const store = request.result.createObjectStore('mutations', { keyPath: 'mutationId' });
        store.createIndex('actor', 'actorId', { unique: false });
        store.createIndex('actor_idempotency', ['actorId', 'idempotencyKey'], { unique: true });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error('INDEXEDDB_OPEN_FAILED'));
    });
    return databasePromise;
  }

  async function requestResult(mode, operation) {
    const db = await database();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('mutations', mode);
      const request = operation(transaction.objectStore('mutations'));
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(new Error('INDEXEDDB_REQUEST_FAILED'));
      transaction.onabort = () => reject(new Error('INDEXEDDB_TRANSACTION_ABORTED'));
    });
  }

  return Object.freeze({
    initialize: database,
    get: (mutationId) => requestResult('readonly', (store) => store.get(mutationId)),
    getByIdempotency: (actorId, key) => requestResult(
      'readonly',
      (store) => store.index('actor_idempotency').get([actorId, key])
    ),
    async claim(record) {
      const db = await database();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction('mutations', 'readwrite');
        const store = transaction.objectStore('mutations');
        const lookup = store.index('actor_idempotency').get([record.actorId, record.idempotencyKey]);
        let canonical = null;
        lookup.onsuccess = () => {
          if (lookup.result) {
            canonical = lookup.result;
            return;
          }
          const insertion = store.add(clone(record));
          insertion.onsuccess = () => { canonical = record; };
        };
        transaction.oncomplete = () => resolve(clone(canonical));
        transaction.onerror = () => reject(new Error('INDEXEDDB_CLAIM_FAILED'));
        transaction.onabort = () => reject(new Error('INDEXEDDB_CLAIM_ABORTED'));
      });
    },
    put: (record) => requestResult('readwrite', (store) => store.put(clone(record))),
    list: (actorId) => requestResult('readonly', (store) => store.index('actor').getAll(actorId))
  });
}

export function createSqliteMutationRepository({ execute, query } = {}) {
  if (typeof execute !== 'function' || typeof query !== 'function') throw new TypeError('SQLITE_ADAPTER_INVALID');
  const parse = (row) => row ? JSON.parse(row.record_json) : null;
  return Object.freeze({
    async initialize() {
      await execute(`create table if not exists vvip_mutation_journal (
        mutation_id text primary key,
        actor_id text not null,
        idempotency_key text not null,
        state text not null,
        created_at integer not null,
        record_json text not null,
        unique (actor_id, idempotency_key)
      )`, []);
    },
    async get(mutationId) {
      const rows = await query('select record_json from vvip_mutation_journal where mutation_id = ?', [mutationId]);
      return parse(rows[0]);
    },
    async getByIdempotency(actorId, key) {
      const rows = await query(
        'select record_json from vvip_mutation_journal where actor_id = ? and idempotency_key = ?',
        [actorId, key]
      );
      return parse(rows[0]);
    },
    async claim(record) {
      await execute(`insert into vvip_mutation_journal
        (mutation_id, actor_id, idempotency_key, state, created_at, record_json)
        values (?, ?, ?, ?, ?, ?)
        on conflict do nothing`, [
        record.mutationId,
        record.actorId,
        record.idempotencyKey,
        record.state,
        record.createdAt,
        JSON.stringify(record)
      ]);
      const rows = await query(
        'select record_json from vvip_mutation_journal where actor_id = ? and idempotency_key = ?',
        [record.actorId, record.idempotencyKey]
      );
      const canonical = parse(rows[0]);
      if (!canonical) throw new Error('MUTATION_REPOSITORY_CONFLICT');
      return canonical;
    },
    async put(record) {
      await execute(`insert into vvip_mutation_journal
        (mutation_id, actor_id, idempotency_key, state, created_at, record_json)
        values (?, ?, ?, ?, ?, ?)
        on conflict (mutation_id) do update set
          state = excluded.state,
          record_json = excluded.record_json`, [
        record.mutationId,
        record.actorId,
        record.idempotencyKey,
        record.state,
        record.createdAt,
        JSON.stringify(record)
      ]);
    },
    async list(actorId) {
      const rows = await query(
        'select record_json from vvip_mutation_journal where actor_id = ? order by created_at, mutation_id',
        [actorId]
      );
      return rows.map(parse);
    }
  });
}