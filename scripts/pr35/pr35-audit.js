import { LIMITS, validateCorrelationKey, validateIdempotencyKey } from './pr35-contracts.js';
import { assertSafeKey, normalizeText, domainError } from './pr35-sanitize.js';
import { normalizeScope } from './pr35-scope.js';

export const REASON_REQUIRED_ACTIONS = Object.freeze(['assignment.create', 'assignment.suspend',
  'assignment.revoke', 'assignment.expire', 'authorization.owner.grant', 'authorization.owner.revoke']);
const secretPattern = /(token|secret|password|authorization|cookie|jwt|session|api[_-]?key)/i;

function sanitizeMetadata(input) {
  if (input === undefined) return Object.freeze(Object.create(null));
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw domainError('INVALID_AUDIT_METADATA');
  const keys = Object.keys(input).sort();
  if (keys.length > LIMITS.AUDIT_METADATA_KEYS) throw domainError('LIST_LIMIT_EXCEEDED');
  const output = Object.create(null);
  for (const key of keys) {
    assertSafeKey(key);
    if (secretPattern.test(key)) throw domainError('AUDIT_SECRET_FIELD');
    const value = input[key];
    if (typeof value === 'string') output[key] = normalizeText(value, { max: LIMITS.TEXT });
    else if (typeof value === 'number' && Number.isFinite(value) || typeof value === 'boolean' || value === null) output[key] = value;
    else throw domainError('INVALID_AUDIT_METADATA');
  }
  return Object.freeze(output);
}
function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
export async function createAuditEvent(input) {
  const action = normalizeText(input?.action, { max: 128, required: true });
  let reason;
  try { reason = normalizeText(input?.reason, { max: LIMITS.REASON, required: REASON_REQUIRED_ACTIONS.includes(action) }); }
  catch (error) { if (error.code === 'FIELD_REQUIRED') throw domainError('REASON_REQUIRED'); throw error; }
  if (!validateCorrelationKey(input?.correlationKey).ok) throw domainError('INVALID_CORRELATION_KEY');
  if (!validateIdempotencyKey(input?.idempotencyKey).ok) throw domainError('INVALID_IDEMPOTENCY_KEY');
  if (input.previousHash !== null && !/^[a-f0-9]{64}$/.test(input.previousHash || '')) throw domainError('INVALID_PREVIOUS_HASH');
  const target = input?.target;
  if (!target || typeof target !== 'object' || Array.isArray(target) || Object.keys(target).some((key) => !['type', 'id'].includes(assertSafeKey(key)))) throw domainError('INVALID_AUDIT_TARGET');
  const at = new Date(input?.at); if (!Number.isFinite(at.getTime()) || at.toISOString() !== input.at) throw domainError('INVALID_TIMESTAMP');
  const event = Object.freeze({ version: 1, previousHash: input.previousHash, at: input.at,
    actorId: normalizeText(input.actorId, { max: 128, required: true }), action,
    target: Object.freeze({ type: normalizeText(target.type, { max: 64, required: true }), id: normalizeText(target.id, { max: 128, required: true }) }),
    scope: normalizeScope(input.scope), reason, correlationKey: input.correlationKey,
    idempotencyKey: input.idempotencyKey, metadata: sanitizeMetadata(input.metadata) });
  return Object.freeze({ event, hash: await sha256(canonical(event)) });
}
export async function verifyAuditChain(entries) {
  if (!Array.isArray(entries) || entries.length > 10000) return { ok: false, code: 'AUDIT_CHAIN_INVALID', index: 0 };
  let previousHash = null;
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    if (entry?.event?.previousHash !== previousHash || entry.hash !== await sha256(canonical(entry.event))) return { ok: false, code: 'AUDIT_CHAIN_INVALID', index };
    previousHash = entry.hash;
  }
  return { ok: true, code: 'AUDIT_CHAIN_VALID' };
}
export function rejectAuditMutation(command) {
  return ['update', 'delete'].includes(command) ? { ok: false, code: 'AUDIT_APPEND_ONLY' } : { ok: false, code: 'UNKNOWN_COMMAND' };
}
