'use strict';

const crypto = require('node:crypto');
const {
  canonicalJson,
  compileFinancialConstitution,
} = require('../financial/constitution-compiler.cjs');

const ENVELOPE_VERSION = 'TIGER_CONSTITUTION_SIGNING_ENVELOPE_V1';
const SIGNING_PAYLOAD_VERSION = 'TIGER_CONSTITUTION_SIGNATURE_PAYLOAD_V1';
const REQUIRED_SIGNATURE_FIELDS = Object.freeze([
  'signer_role',
  'signer_subject',
  'key_ref',
  'signature_profile',
  'signed_at',
  'signature_base64',
]);

function freezeDeep(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) freezeDeep(child);
  return value;
}

function assertString(value, label) {
  if (typeof value !== 'string' || value.trim() === '') throw new Error(`${label} is required`);
  return value.trim();
}

function validateCryptoPolicy(policy) {
  if (!policy || typeof policy !== 'object' || Array.isArray(policy)) throw new Error('crypto policy is required');
  if (policy.reference !== 'TSN-26') throw new Error('crypto policy reference must be TSN-26');
  if (policy.fail_closed !== true) throw new Error('crypto policy must fail closed');
  if (policy.repository_private_key_allowed !== false) throw new Error('repository private key material must be forbidden');
  if (!Array.isArray(policy.required_constitution_quorum) || policy.required_constitution_quorum.length < 2) {
    throw new Error('constitution quorum must contain independent authorities');
  }
  if (new Set(policy.required_constitution_quorum).size !== policy.required_constitution_quorum.length) {
    throw new Error('constitution quorum roles must be unique');
  }
  if (!policy.signature_profiles || typeof policy.signature_profiles !== 'object') throw new Error('signature profiles are required');
  return policy;
}

function createConstitutionSigningEnvelope(manifest, { cryptoPolicy } = {}) {
  const policy = validateCryptoPolicy(cryptoPolicy);
  const compiled = compileFinancialConstitution(manifest);
  return freezeDeep({
    envelope_version: ENVELOPE_VERSION,
    constitution_id: compiled.constitution_id,
    constitution_digest: compiled.constitution_digest,
    compiler_version: compiled.compiler_version,
    crypto_policy_id: policy.policy_id,
    required_quorum: [...policy.required_constitution_quorum],
    production_activation: 'VERIFY_SIGNATURES_AND_QUORUM',
    signatures: [],
  });
}

function signingPayload({ constitutionId, constitutionDigest, cryptoPolicyId, signature }) {
  if (!signature || typeof signature !== 'object') throw new Error('signature descriptor is required');
  const payload = {
    payload_version: SIGNING_PAYLOAD_VERSION,
    constitution_id: assertString(constitutionId, 'constitution id'),
    constitution_digest: assertString(constitutionDigest, 'constitution digest'),
    crypto_policy_id: assertString(cryptoPolicyId, 'crypto policy id'),
    signer_role: assertString(signature.signer_role, 'signer role'),
    signer_subject: assertString(signature.signer_subject, 'signer subject'),
    key_ref: assertString(signature.key_ref, 'key ref'),
    signature_profile: assertString(signature.signature_profile, 'signature profile'),
    signed_at: assertString(signature.signed_at, 'signed at'),
  };
  return canonicalJson(payload);
}

function assertSignatureShape(signature) {
  if (!signature || typeof signature !== 'object' || Array.isArray(signature)) throw new Error('signature record must be an object');
  for (const field of REQUIRED_SIGNATURE_FIELDS) assertString(signature[field], `signature ${field}`);
  for (const key of Object.keys(signature)) {
    if (!REQUIRED_SIGNATURE_FIELDS.includes(key)) throw new Error(`unknown signature field: ${key}`);
  }
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(signature.signature_base64)) throw new Error('signature_base64 must be canonical base64');
}

function assertCurrentProfile(policy, profileName) {
  const profile = policy.signature_profiles[profileName];
  if (!profile) throw new Error(`unknown signature profile: ${profileName}`);
  if (profile.status !== 'CURRENT' || profile.production_activation_allowed !== true) {
    throw new Error(`signature profile ${profileName} must be CURRENT and production-activation approved`);
  }
  const allowed = policy.purposes?.CONSTITUTION_SIGNATURE?.allowed_profiles || [];
  if (!allowed.includes(profileName)) throw new Error(`signature profile ${profileName} is not allowed for constitution activation`);
  return profile;
}

function verifyWithProfile(profileName, publicKey, payload, signatureBytes) {
  if (profileName === 'ED25519') return crypto.verify(null, Buffer.from(payload), publicKey, signatureBytes);
  if (profileName === 'ES256') return crypto.verify('sha256', Buffer.from(payload), publicKey, signatureBytes);
  throw new Error(`no verifier is registered for CURRENT signature profile ${profileName}`);
}

function assertKeyUsable(keyRecord, signature, now) {
  if (!keyRecord) throw new Error(`key ${signature.key_ref} was not resolved from trusted key registry`);
  if (keyRecord.status !== 'ACTIVE') throw new Error(`key ${signature.key_ref} must be ACTIVE`);
  if (keyRecord.signatureProfile !== signature.signature_profile) throw new Error(`key ${signature.key_ref} signature profile mismatch`);
  if (!keyRecord.publicKey) throw new Error(`key ${signature.key_ref} public verification key is required`);
  if (keyRecord.notBefore && now < new Date(keyRecord.notBefore)) throw new Error(`key ${signature.key_ref} is not active yet`);
  if (keyRecord.notAfter && now >= new Date(keyRecord.notAfter)) throw new Error(`key ${signature.key_ref} is expired`);
}

function assertSignatureFresh(signature, now, policy) {
  const signedAt = new Date(signature.signed_at);
  if (!Number.isFinite(signedAt.getTime())) throw new Error('signature signed_at must be an ISO instant');
  if (signedAt > now) throw new Error('signature signed_at cannot be in the future');
  const maxAgeMs = Number(policy.constitution_signature_max_age_seconds) * 1000;
  if (!Number.isSafeInteger(maxAgeMs) || maxAgeMs <= 0) throw new Error('crypto policy constitution signature max age is invalid');
  if (now.getTime() - signedAt.getTime() > maxAgeMs) throw new Error('constitution signature is stale');
}

function verifyConstitutionActivation(manifest, envelope, { cryptoPolicy, now = new Date(), resolveKey } = {}) {
  const policy = validateCryptoPolicy(cryptoPolicy);
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) throw new Error('trusted current time is required');
  if (typeof resolveKey !== 'function') throw new Error('trusted key resolver is required');
  if (!envelope || typeof envelope !== 'object' || Array.isArray(envelope)) throw new Error('signing envelope is required');

  const compiled = compileFinancialConstitution(manifest);
  if (envelope.envelope_version !== ENVELOPE_VERSION) throw new Error('signing envelope version mismatch');
  if (envelope.constitution_id !== compiled.constitution_id) throw new Error('constitution id mismatch');
  if (envelope.constitution_digest !== compiled.constitution_digest) throw new Error('constitution digest mismatch');
  if (envelope.compiler_version !== compiled.compiler_version) throw new Error('constitution compiler version mismatch');
  if (envelope.crypto_policy_id !== policy.policy_id) throw new Error('crypto policy id mismatch');

  const quorum = policy.required_constitution_quorum;
  if (canonicalJson(envelope.required_quorum) !== canonicalJson(quorum)) throw new Error('constitution quorum policy mismatch');
  if (!Array.isArray(envelope.signatures)) throw new Error('constitution signatures array is required');

  const roleMap = new Map();
  for (const signature of envelope.signatures) {
    assertSignatureShape(signature);
    if (!quorum.includes(signature.signer_role)) throw new Error(`unrecognized constitution signer role: ${signature.signer_role}`);
    if (roleMap.has(signature.signer_role)) throw new Error(`duplicate constitution signer role: ${signature.signer_role}`);
    assertCurrentProfile(policy, signature.signature_profile);
    assertSignatureFresh(signature, now, policy);
    roleMap.set(signature.signer_role, signature);
  }

  for (const role of quorum) {
    if (!roleMap.has(role)) throw new Error(`missing required constitution signer: ${role}`);
  }

  const subjects = quorum.map((role) => roleMap.get(role).signer_subject);
  const keyRefs = quorum.map((role) => roleMap.get(role).key_ref);
  if (new Set(subjects).size !== subjects.length || new Set(keyRefs).size !== keyRefs.length) {
    throw new Error('constitution quorum signers must be independent subjects with independent keys');
  }

  let verified = 0;
  for (const role of quorum) {
    const signature = roleMap.get(role);
    const keyRecord = resolveKey(signature.key_ref);
    assertKeyUsable(keyRecord, signature, now);
    const payload = signingPayload({
      constitutionId: compiled.constitution_id,
      constitutionDigest: compiled.constitution_digest,
      cryptoPolicyId: policy.policy_id,
      signature,
    });
    const signatureBytes = Buffer.from(signature.signature_base64, 'base64');
    if (!verifyWithProfile(signature.signature_profile, keyRecord.publicKey, payload, signatureBytes)) {
      throw new Error(`signature verification failed for ${role}`);
    }
    verified += 1;
  }

  return freezeDeep({
    allowed: true,
    decision: 'CONSTITUTION_ACTIVATION_ALLOWED',
    constitution_id: compiled.constitution_id,
    constitution_digest: compiled.constitution_digest,
    crypto_policy_id: policy.policy_id,
    verified_signatures: verified,
    verified_roles: [...quorum],
  });
}

module.exports = Object.freeze({
  ENVELOPE_VERSION,
  SIGNING_PAYLOAD_VERSION,
  createConstitutionSigningEnvelope,
  signingPayload,
  verifyConstitutionActivation,
  validateCryptoPolicy,
});
