import { createHash } from 'node:crypto';

import { verifyActionPassport } from './agentic-control.mjs';

const SHA1_PATTERN = /^[a-f0-9]{40}$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const MAX_ID_LENGTH = 256;
const MAX_TEXT_LENGTH = 4096;
const MAX_LIST_ITEMS = 128;
const PROVIDER_SUPPORT = new Set(['PRODUCTION_GRADE_SUPPORTED', 'PILOT_ONLY', 'UNSUPPORTED']);
const MIGRATION_COMPATIBILITY = new Set(['COMPATIBLE', 'PARTIAL', 'INCOMPATIBLE']);

export class AionCryptoAttestationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'AionCryptoAttestationError';
    this.code = code;
  }
}

function fail(code, message) {
  throw new AionCryptoAttestationError(code, message);
}

function isPlainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function requireString(value, field, max = MAX_ID_LENGTH) {
  if (typeof value !== 'string' || value.length === 0 || value.length > max || value.includes('\0')) {
    fail('AION_CRYPTO_INVALID', `${field} is outside allowed bounds`);
  }
  return value;
}

function requireExactSourceSha(value) {
  if (typeof value !== 'string' || !SHA1_PATTERN.test(value)) {
    fail('AION_CRYPTO_INVALID', 'exact_source_sha must be an exact 40-character Git SHA');
  }
  return value;
}

function requireSha256(value, field, code = 'AION_ATTESTATION_INTEGRITY_INVALID') {
  if (typeof value !== 'string' || !SHA256_PATTERN.test(value)) {
    fail(code, `${field} must be a 64-character SHA-256 digest`);
  }
  return value;
}

function parseTimestamp(value, field, code = 'AION_CRYPTO_INVALID') {
  if (typeof value !== 'string' || value.length === 0 || value.length > 64) {
    fail(code, `${field} must be a bounded timestamp`);
  }
  const pattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/;
  if (!pattern.test(value)) fail(code, `${field} must be ISO-8601 with timezone`);
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) fail(code, `${field} is invalid`);
  return ms;
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

function verifyDigest(record, label, code) {
  if (typeof record?.content_digest !== 'string' || !SHA256_PATTERN.test(record.content_digest)) {
    fail(code, `${label} content digest is invalid`);
  }
  const { content_digest: ignored, ...payload } = record;
  if (digest(payload) !== record.content_digest) {
    fail(code, `${label} content digest does not match its payload`);
  }
}

function normalizeUniqueStrings(values, field, { code = 'AION_CRYPTO_INVALID', allowEmpty = false } = {}) {
  if (!Array.isArray(values) || values.length > MAX_LIST_ITEMS || (!allowEmpty && values.length === 0)) {
    fail(code, `${field} must be a bounded${allowEmpty ? '' : ' non-empty'} array`);
  }
  const seen = new Set();
  const output = values.map((value, index) => {
    if (typeof value !== 'string' || value.length === 0 || value.length > MAX_TEXT_LENGTH || value.includes('\0')) {
      fail(code, `${field}[${index}] is outside allowed bounds`);
    }
    if (seen.has(value)) fail(code, `${field} contains duplicate value: ${value}`);
    seen.add(value);
    return value;
  });
  output.sort();
  return Object.freeze(output);
}

function requireNonCustomAlgorithm(value) {
  const algorithm = requireString(value, 'algorithm', MAX_TEXT_LENGTH);
  const normalized = algorithm.trim().toUpperCase();
  if (normalized.startsWith('TIGER-') || normalized.startsWith('TIGER_')) {
    fail('AION_CRYPTO_CUSTOM_ALGORITHM_FORBIDDEN', 'AION must not invent or authorize TIGER-specific cryptographic algorithms');
  }
  return algorithm;
}

function normalizeInventoryShape(input) {
  if (!isPlainObject(input)) fail('AION_CRYPTO_INVALID', 'crypto inventory input must be a plain object');
  const recordedAtMs = parseTimestamp(input.recorded_at, 'recorded_at');
  const expiresAtMs = parseTimestamp(input.expires_at, 'expires_at');
  const rotationDueAtMs = parseTimestamp(input.rotation_due_at, 'rotation_due_at');
  if (recordedAtMs >= expiresAtMs || rotationDueAtMs > expiresAtMs || rotationDueAtMs < recordedAtMs) {
    fail('AION_CRYPTO_INVALID', 'crypto lifecycle timestamps are inconsistent');
  }
  if (!MIGRATION_COMPATIBILITY.has(input.migration_compatibility)) {
    fail('AION_CRYPTO_INVALID', 'migration_compatibility is not allowed');
  }
  if (!PROVIDER_SUPPORT.has(input.provider_support)) {
    fail('AION_CRYPTO_INVALID', 'provider_support is not allowed');
  }
  const standardsRefs = normalizeUniqueStrings(input.standards_refs, 'standards_refs', {
    code: 'AION_CRYPTO_STANDARD_EVIDENCE_REQUIRED',
  });
  const providerEvidenceRefs = normalizeUniqueStrings(input.provider_evidence_refs, 'provider_evidence_refs');
  return {
    inventory_id: requireString(input.inventory_id, 'inventory_id'),
    recorded_at: input.recorded_at,
    exact_source_sha: requireExactSourceSha(input.exact_source_sha),
    algorithm: requireNonCustomAlgorithm(input.algorithm),
    protocol: requireString(input.protocol, 'protocol', MAX_TEXT_LENGTH),
    standards_refs: standardsRefs,
    key_or_certificate_owner_ref: requireString(input.key_or_certificate_owner_ref, 'key_or_certificate_owner_ref', MAX_TEXT_LENGTH),
    protected_data_classes: normalizeUniqueStrings(input.protected_data_classes, 'protected_data_classes'),
    expires_at: input.expires_at,
    rotation_due_at: input.rotation_due_at,
    migration_compatibility: input.migration_compatibility,
    provider_support: input.provider_support,
    provider_evidence_refs: providerEvidenceRefs,
  };
}

function ensureInventory(entry) {
  if (!isPlainObject(entry) || entry.schema_version !== 'TIGER-AION-CRYPTO-INVENTORY-1') {
    fail('AION_CRYPTO_INTEGRITY_INVALID', 'invalid crypto inventory record');
  }
  const normalized = normalizeInventoryShape(entry);
  if (
    entry.quantum_ready_claimed !== false
    || entry.production_mutation_authorized !== false
    || entry.execution_performed !== false
  ) {
    fail('AION_CRYPTO_INTEGRITY_INVALID', 'crypto inventory cannot claim readiness or execution authority');
  }
  for (const [key, value] of Object.entries(normalized)) {
    if (Array.isArray(value)) {
      if (!Array.isArray(entry[key]) || JSON.stringify([...entry[key]].sort()) !== JSON.stringify([...value])) {
        fail('AION_CRYPTO_INTEGRITY_INVALID', `crypto inventory ${key} is inconsistent`);
      }
    } else if (entry[key] !== value) {
      fail('AION_CRYPTO_INTEGRITY_INVALID', `crypto inventory ${key} is inconsistent`);
    }
  }
  verifyDigest(entry, 'crypto inventory', 'AION_CRYPTO_INTEGRITY_INVALID');
}

function verifyAuthorization(authorization, passport) {
  if (!isPlainObject(authorization) || authorization.schema_version !== 'TIGER-AION-AUTHORIZATION-DECISION-1') {
    fail('AION_ATTESTATION_A5_BINDING_INVALID', 'missing deterministic A5 authorization');
  }
  verifyDigest(authorization, 'A5 authorization', 'AION_ATTESTATION_A5_BINDING_INVALID');
  if (
    authorization.decision !== 'AUTHORIZED'
    || authorization.passport_id !== passport.passport_id
    || authorization.exact_source_sha !== passport.exact_source_sha
    || authorization.autonomy_level !== passport.requested_autonomy_level
    || authorization.production_mutation_authorized !== false
    || authorization.unrestricted_production_mutation !== false
  ) {
    fail('AION_ATTESTATION_A5_BINDING_INVALID', 'A5 authorization does not exactly bind the supplied Action Passport');
  }
  const authorized = [...authorization.authorized_capabilities].sort();
  const requested = [...passport.requested_capabilities].sort();
  if (JSON.stringify(authorized) !== JSON.stringify(requested)) {
    fail('AION_ATTESTATION_A5_BINDING_INVALID', 'A5 authorization capabilities do not match the Action Passport');
  }
}

function normalizeAttestation(attestation) {
  if (!isPlainObject(attestation)) fail('AION_ATTESTATION_INTEGRITY_INVALID', 'attestation must be a plain object');
  if (attestation.verification_result !== 'VERIFIED') {
    fail('AION_ATTESTATION_INTEGRITY_INVALID', 'attestation verification_result must be VERIFIED');
  }
  const verifiedAtMs = parseTimestamp(attestation.verified_at, 'attestation.verified_at', 'AION_ATTESTATION_INTEGRITY_INVALID');
  const expiresAtMs = parseTimestamp(attestation.expires_at, 'attestation.expires_at', 'AION_ATTESTATION_INTEGRITY_INVALID');
  if (verifiedAtMs >= expiresAtMs) fail('AION_ATTESTATION_INTEGRITY_INVALID', 'attestation expiry must follow verification');
  return Object.freeze({
    verifier_ref: requireString(attestation.verifier_ref, 'attestation.verifier_ref', MAX_TEXT_LENGTH),
    quote_ref: requireString(attestation.quote_ref, 'attestation.quote_ref', MAX_TEXT_LENGTH),
    measurement_digest: requireSha256(attestation.measurement_digest, 'attestation.measurement_digest'),
    workload_digest: requireSha256(attestation.workload_digest, 'attestation.workload_digest'),
    verified_at: attestation.verified_at,
    expires_at: attestation.expires_at,
    verification_result: 'VERIFIED',
  });
}

export function createCryptoInventoryEntry(input) {
  const value = normalizeInventoryShape(input);
  return seal({
    schema_version: 'TIGER-AION-CRYPTO-INVENTORY-1',
    ...value,
    quantum_ready_claimed: false,
    production_mutation_authorized: false,
    execution_performed: false,
  });
}

export function verifyCryptoInventoryEntry(entry) {
  ensureInventory(entry);
  return true;
}

export function createPqcMigrationCandidate(input) {
  if (!isPlainObject(input)) fail('AION_CRYPTO_INVALID', 'PQC migration input must be a plain object');
  ensureInventory(input.inventory);
  if (input.inventory.provider_support !== 'PRODUCTION_GRADE_SUPPORTED') {
    fail('AION_CRYPTO_PRODUCTION_SUPPORT_REQUIRED', 'PQC migration requires production-grade provider support evidence');
  }
  const standardEvidence = normalizeUniqueStrings(input.approved_standard_evidence_refs, 'approved_standard_evidence_refs', {
    code: 'AION_CRYPTO_STANDARD_EVIDENCE_REQUIRED',
  });
  const interopEvidence = normalizeUniqueStrings(input.interoperability_test_refs, 'interoperability_test_refs', {
    code: 'AION_CRYPTO_INTEROP_REQUIRED',
  });
  const createdAtMs = parseTimestamp(input.created_at, 'created_at');
  if (createdAtMs < Date.parse(input.inventory.recorded_at) || createdAtMs > Date.parse(input.inventory.expires_at)) {
    fail('AION_CRYPTO_INVALID', 'PQC migration candidate must bind a current inventory record');
  }
  return seal({
    schema_version: 'TIGER-AION-PQC-MIGRATION-CANDIDATE-1',
    candidate_id: requireString(input.candidate_id, 'candidate_id'),
    created_at: input.created_at,
    exact_source_sha: input.inventory.exact_source_sha,
    inventory_id: input.inventory.inventory_id,
    inventory_digest: input.inventory.content_digest,
    algorithm: input.inventory.algorithm,
    protocol: input.inventory.protocol,
    approved_standard_evidence_refs: standardEvidence,
    provider_evidence_refs: input.inventory.provider_evidence_refs,
    interoperability_test_refs: interopEvidence,
    rollback_ref: requireString(input.rollback_ref, 'rollback_ref', MAX_TEXT_LENGTH),
    recovery_checkpoint_ref: requireString(input.recovery_checkpoint_ref, 'recovery_checkpoint_ref', MAX_TEXT_LENGTH),
    status: 'MIGRATION_CANDIDATE_ONLY',
    quantum_ready_claimed: false,
    execution_performed: false,
    production_mutation_authorized: false,
    unrestricted_production_mutation: false,
  });
}

export function createAttestedHighSecurityCell(input) {
  if (!isPlainObject(input)) fail('AION_ATTESTATION_INTEGRITY_INVALID', 'attested cell input must be a plain object');
  try {
    verifyActionPassport(input.passport);
  } catch (error) {
    fail('AION_ATTESTATION_A5_BINDING_INVALID', `invalid A5 Action Passport: ${error?.code ?? 'UNKNOWN'}`);
  }
  verifyAuthorization(input.authorization, input.passport);
  const exactSourceSha = requireExactSourceSha(input.exact_source_sha);
  if (exactSourceSha !== input.passport.exact_source_sha) {
    fail('AION_ATTESTATION_A5_BINDING_INVALID', 'attested cell exact source must match its Action Passport');
  }
  const requestedCapabilities = normalizeUniqueStrings(input.requested_capabilities, 'requested_capabilities', {
    code: 'AION_ATTESTATION_CAPABILITY_ESCALATION',
  });
  const passportCapabilities = new Set(input.passport.requested_capabilities);
  for (const capability of requestedCapabilities) {
    if (!passportCapabilities.has(capability)) {
      fail('AION_ATTESTATION_CAPABILITY_ESCALATION', `attestation cannot grant capability outside A5 authority: ${capability}`);
    }
  }
  const createdAtMs = parseTimestamp(input.created_at, 'created_at', 'AION_ATTESTATION_INTEGRITY_INVALID');
  const attestation = normalizeAttestation(input.attestation);
  if (createdAtMs < Date.parse(attestation.verified_at) || createdAtMs > Date.parse(attestation.expires_at)) {
    fail('AION_ATTESTATION_INTEGRITY_INVALID', 'attested cell must be created during the verified attestation window');
  }
  return seal({
    schema_version: 'TIGER-AION-ATTESTED-HIGH-SECURITY-CELL-1',
    attested_cell_id: requireString(input.attested_cell_id, 'attested_cell_id'),
    created_at: input.created_at,
    exact_source_sha: exactSourceSha,
    passport_id: input.passport.passport_id,
    passport_digest: input.passport.content_digest,
    authorization_digest: input.authorization.content_digest,
    autonomy_level: input.authorization.autonomy_level,
    granted_capabilities: requestedCapabilities,
    justification_ref: requireString(input.justification_ref, 'justification_ref', MAX_TEXT_LENGTH),
    attestation,
    status: 'ATTESTED_EVIDENCE_BOUND',
    privilege_escalation_granted: false,
    production_mutation_authorized: false,
    unrestricted_production_mutation: false,
    execution_performed: false,
  });
}

export function verifyAttestedHighSecurityCell(record, nowMs) {
  if (!isPlainObject(record) || record.schema_version !== 'TIGER-AION-ATTESTED-HIGH-SECURITY-CELL-1') {
    fail('AION_ATTESTATION_INTEGRITY_INVALID', 'invalid attested high-security cell');
  }
  verifyDigest(record, 'attested high-security cell', 'AION_ATTESTATION_INTEGRITY_INVALID');
  requireString(record.attested_cell_id, 'attested_cell_id');
  requireExactSourceSha(record.exact_source_sha);
  requireString(record.passport_id, 'passport_id');
  requireSha256(record.passport_digest, 'passport_digest');
  requireSha256(record.authorization_digest, 'authorization_digest');
  normalizeUniqueStrings(record.granted_capabilities, 'granted_capabilities', { code: 'AION_ATTESTATION_INTEGRITY_INVALID' });
  requireString(record.justification_ref, 'justification_ref', MAX_TEXT_LENGTH);
  const attestation = normalizeAttestation(record.attestation);
  if (
    record.status !== 'ATTESTED_EVIDENCE_BOUND'
    || record.privilege_escalation_granted !== false
    || record.production_mutation_authorized !== false
    || record.unrestricted_production_mutation !== false
    || record.execution_performed !== false
  ) {
    fail('AION_ATTESTATION_INTEGRITY_INVALID', 'attested cell cannot carry escalation or execution authority');
  }
  if (typeof nowMs !== 'number' || !Number.isFinite(nowMs)) {
    fail('AION_ATTESTATION_INTEGRITY_INVALID', 'now_ms must be a finite injected clock value');
  }
  if (nowMs > Date.parse(attestation.expires_at)) {
    fail('AION_ATTESTATION_STALE', 'attestation evidence is stale');
  }
  if (nowMs < Date.parse(attestation.verified_at)) {
    fail('AION_ATTESTATION_INTEGRITY_INVALID', 'attestation is not yet valid');
  }
  return true;
}
