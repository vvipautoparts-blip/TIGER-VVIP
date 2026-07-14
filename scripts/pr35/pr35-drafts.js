import { validateCareRequest } from './pr35-tiger-care.js';

const fail = (code) => Object.freeze({ ok: false, code });
const MAX_ITEMS = 20; const MAX_BYTES = 65536;
const keyFor = (kind, sessionId) => `vvip:pr35:${kind}:${sessionId}`;
const read = (storage, key, fallback) => { try { return JSON.parse(storage.getItem(key)) || fallback; } catch { return fallback; } };
const write = (storage, key, value) => {
  const serialized = JSON.stringify(value);
  if (new TextEncoder().encode(serialized).length > MAX_BYTES) return fail('QUEUE_SIZE_EXCEEDED');
  try { storage.setItem(key, serialized); return { ok: true }; } catch { return fail('SESSION_STORAGE_UNAVAILABLE'); }
};
const normalize = (input, actorId) => validateCareRequest({ ...input, requesterId: actorId });

export function createDraftStore(sessionStorage, sessionId) {
  const key = keyFor('draft', sessionId);
  return Object.freeze({
    save(input, { actorId }) { const valid = normalize(input, actorId); if (!valid.ok) return valid;
      const result = write(sessionStorage, key, { actorId, value: valid.value }); return result.ok ? Object.freeze({ ok: true, code: 'DRAFT_SAVED' }) : result; },
    load({ actorId }) { const draft = read(sessionStorage, key, null); return !draft || draft.actorId !== actorId ? fail('DRAFT_NOT_FOUND') : Object.freeze({ ok: true, code: 'OK', value: structuredClone(draft.value) }); },
    clear() { sessionStorage.removeItem(key); return Object.freeze({ ok: true, code: 'DRAFT_CLEARED' }); }
  });
}

export function createUserSubmissionQueue(sessionStorage, sessionId) {
  const key = keyFor('queue', sessionId);
  const items = () => read(sessionStorage, key, []);
  return Object.freeze({
    enqueue(input, context) {
      if (context?.actor?.kind !== 'user' || input?.commandType) return fail('OFFLINE_PRIVILEGED_DENIED');
      const valid = normalize(input, context.actor.id); if (!valid.ok) return valid;
      const queue = items();
      const existing = queue.find((item) => item.idempotencyKey === context.idempotencyKey);
      if (existing) return fail('DUPLICATE_SUBMISSION');
      if (queue.length >= MAX_ITEMS) return fail('QUEUE_LIMIT_EXCEEDED');
      const entry = { idempotencyKey: context.idempotencyKey, correlationKey: context.correlationKey,
        actorId: context.actor.id, payload: valid.value, state: 'pending', attempts: 0 };
      const result = write(sessionStorage, key, [...queue, entry]);
      return result.ok ? Object.freeze({ ok: true, code: 'QUEUED', state: 'pending' }) : result;
    },
    async flush(send, context) {
      const queue = items(); const updated = [];
      for (const entry of queue) {
        if (entry.state === 'sent') { updated.push(entry); continue; }
        if (entry.actorId !== context?.actor?.id || context.actor.kind !== 'user') { updated.push({ ...entry, state: 'failed', code: 'FORGED_IDENTITY' }); continue; }
        try { const result = await send(structuredClone(entry.payload), { ...context, idempotencyKey: entry.idempotencyKey, correlationKey: entry.correlationKey });
          updated.push({ ...entry, attempts: entry.attempts + 1, state: result.ok ? 'sent' : 'failed', code: result.code });
        } catch { updated.push({ ...entry, attempts: entry.attempts + 1, state: 'failed', code: 'NETWORK_UNAVAILABLE' }); }
      }
      write(sessionStorage, key, updated); return Object.freeze({ ok: true, code: 'QUEUE_FLUSHED', items: Object.freeze(updated.map(Object.freeze)) });
    }, list() { return Object.freeze(items().map((item) => Object.freeze(structuredClone(item)))); }
  });
}
