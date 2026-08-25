import { createHash } from 'node:crypto';

const MAX_ID_LENGTH = 256;
const MAX_LINEAGE_ITEMS = 128;
const MAX_OBJECTIVE_SECONDS = 31_536_000;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;

export class AionRecoveryError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'AionRecoveryError';
    this.code = code;
  }
}

function fail(code, message) {
  throw new AionRecoveryError(code, message);
}

function isPlainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function requireString(value, field, max = MAX_ID_LENGTH) {
  if (typeof value !== 'string' || value.length === 0 || value.length > max || value.includes('\0')) {
    fail('AION_RECOVERY_INVALID', `${field} is outside allowed bounds`);
  }
  return value;
}

function parseTimestamp(value, field) {
  requireString(value, field, 64);
  const isoPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/;
  if (!isoPattern.test(value)) fail('AION_RECOVERY_INVALID', `${field} must be ISO-8601 with timezone`);
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) fail('AION_RECOVERY_INVALID', `${field} is invalid`);
  return milliseconds;
}

function requireObjective(value, field) {
  if (!Number.isInteger(value) || value < 0 || value > MAX_OBJECTIVE_SECONDS) {
    fail('AION_RECOVERY_INVALID', `${field} is outside bounded recovery objective range`);
  }
  return value;
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

function requireDigest(value, field) {
  if (typeof value !== 'string' || !SHA256_PATTERN.test(value)) {
    fail('AION_RECOVERY_INVALID', `${field} must be a sha256 digest`);
  }
  return value;
}

function requireRestoreDigest(value, field) {
  if (typeof value !== 'string' || !SHA256_PATTERN.test(value)) {
    fail('AION_RESTORE_PROOF_INVALID', `${field} must be a sha256 digest`);
  }
  return value;
}

function requireSource(source) {
  if (!isPlainObject(source)) fail('AION_RESTORE_PROOF_INVALID', 'source must be a plain object');
  return Object.freeze({
    system: requireString(source.system, 'source.system'),
    component: requireString(source.component, 'source.component'),
  });
}

function verifySealedDigest(record, code, label) {
  const contentDigest = record?.content_digest;
  if (typeof contentDigest !== 'string' || !SHA256_PATTERN.test(contentDigest)) {
    fail(code, `${label} content digest is invalid`);
  }
  const { content_digest: ignored, ...payload } = record;
  if (digest(payload) !== contentDigest) {
    fail(code, `${label} content digest does not match its payload`);
  }
}

function ensureCheckpoint(checkpoint) {
  if (!isPlainObject(checkpoint) || checkpoint.schema_version !== 'TIGER-AION-RECOVERY-CHECKPOINT-1') {
    fail('AION_RECOVERY_INVALID', 'invalid recovery checkpoint');
  }
  requireString(checkpoint.checkpoint_id, 'checkpoint.checkpoint_id');
  requireDigest(checkpoint.image_digest, 'checkpoint.image_digest');
  verifySealedDigest(checkpoint, 'AION_RECOVERY_INTEGRITY_INVALID', 'recovery checkpoint');
}

function ensureRestoreProof(proof) {
  if (!isPlainObject(proof) || proof.schema_version !== 'TIGER-AION-RESTORE-PROOF-1') {
    fail('AION_RESTORE_PROOF_INVALID', 'invalid restore proof');
  }
  requireString(proof.proof_id, 'restore_proof.proof_id');
  requireRestoreDigest(proof.restored_image_digest, 'restore_proof.restored_image_digest');
  verifySealedDigest(proof, 'AION_RECOVERY_INTEGRITY_INVALID', 'restore proof');
}

export function createRecoveryCheckpoint(input) {
  if (!isPlainObject(input)) fail('AION_RECOVERY_INVALID', 'checkpoint input must be a plain object');

  const createdAtMs = parseTimestamp(input.created_at, 'created_at');
  const expiresAtMs = parseTimestamp(input.expires_at, 'expires_at');
  if (expiresAtMs <= createdAtMs) fail('AION_RECOVERY_INVALID', 'checkpoint expiry must follow creation');

  if (!Array.isArray(input.lineage) || input.lineage.length === 0 || input.lineage.length > MAX_LINEAGE_ITEMS) {
    fail('AION_RECOVERY_INVALID', 'lineage must contain bounded recovery ancestors');
  }
  const lineage = input.lineage.map((item, index) => requireString(item, `lineage[${index}]`));

  const checkpoint = {
    schema_version: 'TIGER-AION-RECOVERY-CHECKPOINT-1',
    checkpoint_id: requireString(input.checkpoint_id, 'checkpoint_id'),
    asset_id: requireString(input.asset_id, 'asset_id'),
    created_at: input.created_at,
    expires_at: input.expires_at,
    rto_seconds: requireObjective(input.rto_seconds, 'rto_seconds'),
    rpo_seconds: requireObjective(input.rpo_seconds, 'rpo_seconds'),
    lineage: Object.freeze([...lineage]),
    image_digest: requireDigest(input.image_digest, 'image_digest'),
  };

  return seal(checkpoint);
}

export function createRestoreProof(input) {
  if (!isPlainObject(input)) fail('AION_RESTORE_PROOF_INVALID', 'restore proof input must be a plain object');

  parseTimestamp(input.observed_at, 'observed_at');
  if (input.authoritative_source !== true) {
    fail('AION_RESTORE_PROOF_INVALID', 'restore proof must come from an authoritative source');
  }

  for (const field of [
    'isolated_twin',
    'integrity_verified',
    'critical_journeys_verified',
    'expected_state_match',
    'twin_destroyed',
  ]) {
    if (input[field] !== true) {
      fail('AION_RESTORE_PROOF_INVALID', `${field} must be true before restore proof can be sealed`);
    }
  }

  const proof = {
    schema_version: 'TIGER-AION-RESTORE-PROOF-1',
    proof_id: requireString(input.proof_id, 'proof_id'),
    checkpoint_id: requireString(input.checkpoint_id, 'checkpoint_id'),
    observed_at: input.observed_at,
    source: requireSource(input.source),
    isolated_twin: true,
    integrity_verified: true,
    critical_journeys_verified: true,
    expected_state_match: true,
    twin_destroyed: true,
    restored_image_digest: requireRestoreDigest(input.restored_image_digest, 'restored_image_digest'),
    measured_rto_seconds: requireObjective(input.measured_rto_seconds, 'measured_rto_seconds'),
    measured_rpo_seconds: requireObjective(input.measured_rpo_seconds, 'measured_rpo_seconds'),
  };

  return seal(proof);
}

export function certifyRecoverability({ checkpoint, restore_proof: restoreProof, now_ms: nowMs }) {
  ensureCheckpoint(checkpoint);
  ensureRestoreProof(restoreProof);
  if (typeof nowMs !== 'number' || !Number.isFinite(nowMs)) {
    fail('AION_RECOVERY_INVALID', 'now_ms must be a finite injected clock value');
  }

  const createdAtMs = Date.parse(checkpoint.created_at);
  const expiresAtMs = Date.parse(checkpoint.expires_at);
  const observedAtMs = Date.parse(restoreProof.observed_at);

  if (nowMs > expiresAtMs) {
    fail('AION_RECOVERY_CHECKPOINT_EXPIRED', 'expired checkpoint cannot certify recoverability');
  }
  if (nowMs < createdAtMs || observedAtMs < createdAtMs || observedAtMs > nowMs) {
    fail('AION_RECOVERY_INVALID', 'restore proof is outside the checkpoint certification window');
  }
  if (
    restoreProof.checkpoint_id !== checkpoint.checkpoint_id
    || restoreProof.restored_image_digest !== checkpoint.image_digest
  ) {
    fail('AION_RECOVERY_LINEAGE_MISMATCH', 'restore proof does not match the supplied checkpoint lineage');
  }

  const rtoMet = restoreProof.measured_rto_seconds <= checkpoint.rto_seconds;
  const rpoMet = restoreProof.measured_rpo_seconds <= checkpoint.rpo_seconds;
  if (!rtoMet || !rpoMet) {
    fail('AION_RECOVERY_OBJECTIVE_NOT_MET', 'measured recovery exceeds the checkpoint RTO/RPO contract');
  }

  return seal({
    schema_version: 'TIGER-AION-RECOVERABILITY-CERTIFICATE-1',
    checkpoint_id: checkpoint.checkpoint_id,
    restore_proof_id: restoreProof.proof_id,
    certified_at_ms: nowMs,
    recoverable: true,
    rto_met: true,
    rpo_met: true,
    restored_image_digest: restoreProof.restored_image_digest,
    checkpoint_digest: checkpoint.content_digest,
    restore_proof_digest: restoreProof.content_digest,
  });
}
