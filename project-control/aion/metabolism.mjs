import { createHash } from 'node:crypto';

export const DELETION_CHAIN = Object.freeze([
  'DETECT',
  'CLASSIFY',
  'EXPLAIN',
  'APPROVE',
  'QUARANTINE',
  'REHEARSE',
  'VERIFY',
  'DELETE',
  'SEAL',
]);

export const LIFECYCLE_STATES = Object.freeze([
  'healthy',
  'degrading',
  'dormant',
  'orphaned',
  'quarantined',
  'retired',
  'disposed',
]);

const STAGES = new Set(DELETION_CHAIN);
const MAX_ID_LENGTH = 256;
const MAX_EVENTS = 128;

export class AionMetabolismError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'AionMetabolismError';
    this.code = code;
  }
}

function fail(code, message) {
  throw new AionMetabolismError(code, message);
}

function isPlainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function requireString(value, field, max = MAX_ID_LENGTH) {
  if (typeof value !== 'string' || value.length === 0 || value.length > max || value.includes('\0')) {
    fail('AION_METABOLISM_INVALID', `${field} is outside allowed bounds`);
  }
  return value;
}

function parseTimestamp(value, field) {
  requireString(value, field, 64);
  const isoPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/;
  if (!isoPattern.test(value) || !Number.isFinite(Date.parse(value))) {
    fail('AION_METABOLISM_INVALID', `${field} must be a valid ISO-8601 timestamp with timezone`);
  }
  return Date.parse(value);
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (isPlainObject(value)) {
    const output = {};
    for (const key of Object.keys(value).sort()) output[key] = canonicalize(value[key]);
    return output;
  }
  return value;
}

function digest(value) {
  return createHash('sha256').update(JSON.stringify(canonicalize(value)), 'utf8').digest('hex');
}

function seal(value) {
  return Object.freeze({ ...value, content_digest: digest(value) });
}

function ensureLedger(ledger) {
  if (!isPlainObject(ledger) || ledger.schema_version !== 'TIGER-AION-LIFECYCLE-LEDGER-1') {
    fail('AION_METABOLISM_INVALID', 'invalid lifecycle ledger');
  }
  requireString(ledger.asset_id, 'ledger.asset_id');
  if (!Array.isArray(ledger.events) || ledger.events.length > MAX_EVENTS) {
    fail('AION_METABOLISM_INVALID', 'ledger events are outside allowed bounds');
  }
}

function requireApproval(authorization) {
  if (!isPlainObject(authorization)) {
    fail('AION_DESTRUCTIVE_ACTION_UNAUTHORIZED', 'APPROVE stage requires an authorization envelope');
  }
  const authority = requireString(authorization.authority, 'authorization.authority');
  if (authorization.decision !== 'APPROVED') {
    fail('AION_DESTRUCTIVE_ACTION_UNAUTHORIZED', 'destructive action has not been approved');
  }
  return Object.freeze({ authority, decision: 'APPROVED' });
}

export function createLifecycleLedger(input) {
  if (!isPlainObject(input)) fail('AION_METABOLISM_INVALID', 'lifecycle input must be a plain object');
  parseTimestamp(input.created_at, 'created_at');

  return seal({
    schema_version: 'TIGER-AION-LIFECYCLE-LEDGER-1',
    asset_id: requireString(input.asset_id, 'asset_id'),
    owner: requireString(input.owner, 'owner'),
    created_at: input.created_at,
    lifecycle_state: 'healthy',
    events: Object.freeze([]),
  });
}

export function recordLifecycleStage(ledger, input) {
  ensureLedger(ledger);
  if (!isPlainObject(input)) fail('AION_METABOLISM_INVALID', 'lifecycle stage input must be a plain object');
  if (ledger.events.length >= MAX_EVENTS) fail('AION_METABOLISM_INVALID', 'lifecycle ledger is full');
  if (!STAGES.has(input.stage)) fail('AION_METABOLISM_INVALID', `unsupported lifecycle stage: ${String(input.stage)}`);

  const occurredAtMs = parseTimestamp(input.occurred_at, 'occurred_at');
  const createdAtMs = Date.parse(ledger.created_at);
  const lastEvent = ledger.events.at(-1);
  const lastOccurredAtMs = lastEvent ? Date.parse(lastEvent.occurred_at) : createdAtMs;
  if (occurredAtMs < createdAtMs || occurredAtMs < lastOccurredAtMs) {
    fail('AION_METABOLISM_INVALID', 'lifecycle events must be monotonic and follow asset creation');
  }
  if (ledger.events.some((event) => event.stage === input.stage)) {
    fail('AION_METABOLISM_INVALID', `duplicate lifecycle stage: ${input.stage}`);
  }

  const event = {
    stage: input.stage,
    occurred_at: input.occurred_at,
    evidence_ref: requireString(input.evidence_ref, 'evidence_ref'),
  };

  if (input.stage === 'APPROVE') event.authorization = requireApproval(input.authorization);
  if (input.stage === 'REHEARSE') {
    event.rollback_plan_ref = requireString(input.rollback_plan_ref, 'rollback_plan_ref');
  }

  const lifecycleState = input.stage === 'QUARANTINE'
    ? 'quarantined'
    : input.stage === 'SEAL'
      ? 'retired'
      : ledger.lifecycle_state;

  return seal({
    schema_version: ledger.schema_version,
    asset_id: ledger.asset_id,
    owner: ledger.owner,
    created_at: ledger.created_at,
    lifecycle_state: lifecycleState,
    events: Object.freeze([...ledger.events, Object.freeze(event)]),
  });
}

export function issueDisposalCertificate(ledger) {
  ensureLedger(ledger);
  const observedChain = ledger.events.map((event) => event.stage);
  const exactChain = observedChain.length === DELETION_CHAIN.length
    && observedChain.every((stage, index) => stage === DELETION_CHAIN[index]);

  if (!exactChain) {
    fail(
      'AION_DESTRUCTIVE_ACTION_UNAUTHORIZED',
      'disposal requires Detect→Classify→Explain→Approve→Quarantine→Rehearse→Verify→Delete→Seal in exact order',
    );
  }

  const approval = ledger.events.find((event) => event.stage === 'APPROVE');
  if (approval?.authorization?.decision !== 'APPROVED') {
    fail('AION_DESTRUCTIVE_ACTION_UNAUTHORIZED', 'disposal has no valid approval evidence');
  }
  const rehearsal = ledger.events.find((event) => event.stage === 'REHEARSE');
  if (!rehearsal?.rollback_plan_ref) {
    fail('AION_DESTRUCTIVE_ACTION_UNAUTHORIZED', 'disposal has no rollback-backed rehearsal evidence');
  }

  const sealedAt = ledger.events.at(-1).occurred_at;
  return seal({
    schema_version: 'TIGER-AION-DISPOSAL-CERTIFICATE-1',
    asset_id: ledger.asset_id,
    owner: ledger.owner,
    lifecycle_state: 'disposed',
    sealed_at: sealedAt,
    lifecycle_ledger_digest: ledger.content_digest,
    authorization_authority: approval.authorization.authority,
    evidence_refs: Object.freeze(ledger.events.map((event) => event.evidence_ref)),
  });
}
