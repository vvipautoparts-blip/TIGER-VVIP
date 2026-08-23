'use strict';

const FORBIDDEN_CREDENTIAL_FIELDS = new Set([
  'access_token',
  'authorization',
  'cookie',
  'credential',
  'credentials',
  'id_token',
  'otp',
  'passkey_private_key',
  'password',
  'private_key',
  'provider_token',
  'refresh_token',
  'secret',
  'session_token',
  'token',
]);

const MAX_REVERIFICATION_FRESHNESS_SECONDS = 300;
const SHA256_HEX = /^[a-f0-9]{64}$/;

function fail(reasonCode) {
  return Object.freeze({
    ok: false,
    reason_code: reasonCode,
    execution_authority: false,
  });
}

function assertNoRawCredentials(value, seen = new WeakSet()) {
  if (value === null || typeof value !== 'object') return;
  if (seen.has(value)) throw new TypeError('cyclic reverification input is forbidden');
  seen.add(value);

  for (const key of Object.keys(value)) {
    const normalizedKey = key.toLowerCase();
    if (FORBIDDEN_CREDENTIAL_FIELDS.has(normalizedKey)) {
      throw new TypeError(`forbidden credential field: ${normalizedKey}`);
    }
    assertNoRawCredentials(value[key], seen);
  }

  seen.delete(value);
}

function requireBoundedString(value, field, maxLength = 256) {
  if (typeof value !== 'string' || value.length === 0 || value.length > maxLength) {
    throw new TypeError(`${field} must be a bounded non-empty string`);
  }
  return value;
}

function normalizeMethod(value) {
  return requireBoundedString(value, 'requested_method_class', 64).toUpperCase();
}

function normalizeMethodSet(value) {
  if (!Array.isArray(value) || value.length > 32) return null;
  const methods = new Set();
  for (const item of value) {
    if (typeof item !== 'string' || item.length === 0 || item.length > 64) return null;
    methods.add(item.toUpperCase());
  }
  return methods;
}

function normalizeInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError('reverification input must be an object');
  }

  assertNoRawCredentials(input);

  const maxFreshness = input.max_freshness_seconds;
  if (!Number.isInteger(maxFreshness) || maxFreshness < 0 || maxFreshness > MAX_REVERIFICATION_FRESHNESS_SECONDS) {
    throw new TypeError('max_freshness_seconds is outside the allowed freshness bound');
  }

  const intentDigest = requireBoundedString(input.intent_digest, 'intent_digest', 64).toLowerCase();
  if (!SHA256_HEX.test(intentDigest)) {
    throw new TypeError('intent_digest must be a lowercase SHA-256 hex digest');
  }

  return Object.freeze({
    provider: requireBoundedString(input.provider, 'provider', 64).toLowerCase(),
    requested_method_class: normalizeMethod(input.requested_method_class),
    evidence_ref: requireBoundedString(input.evidence_ref, 'evidence_ref', 256),
    principal: requireBoundedString(input.principal, 'principal', 256),
    intent_digest: intentDigest,
    challenge_ref: requireBoundedString(input.challenge_ref, 'challenge_ref', 256),
    max_freshness_seconds: maxFreshness,
  });
}

function createReverificationAdapter({ verifyProviderEvidence, getProviderCapabilities } = {}) {
  if (typeof getProviderCapabilities !== 'function' || typeof verifyProviderEvidence !== 'function') {
    throw new TypeError('provider capability discovery and evidence verification ports are required');
  }

  return Object.freeze({
    async verifyForIntent(rawInput) {
      const input = normalizeInput(rawInput);

      let capabilities;
      try {
        capabilities = await getProviderCapabilities(Object.freeze({
          provider: input.provider,
          purpose: 'PRIVILEGED_REVERIFICATION',
        }));
      } catch {
        return fail('REVERIFICATION_PROVIDER_CAPABILITIES_UNAVAILABLE');
      }

      if (!capabilities || capabilities.ok !== true) {
        return fail('REVERIFICATION_PROVIDER_CAPABILITIES_UNAVAILABLE');
      }

      if (typeof capabilities.provider !== 'string' || capabilities.provider.toLowerCase() !== input.provider) {
        return fail('REVERIFICATION_PROVIDER_CAPABILITIES_UNAVAILABLE');
      }

      const supportedMethods = normalizeMethodSet(capabilities.privileged_reverification_methods);
      const phishingResistantMethods = normalizeMethodSet(capabilities.phishing_resistant_methods);
      if (!supportedMethods || !phishingResistantMethods || !supportedMethods.has(input.requested_method_class)) {
        return fail('REVERIFICATION_METHOD_UNSUPPORTED');
      }

      let evidence;
      try {
        evidence = await verifyProviderEvidence(Object.freeze({
          provider: input.provider,
          method_class: input.requested_method_class,
          evidence_ref: input.evidence_ref,
          principal: input.principal,
          intent_digest: input.intent_digest,
          challenge_ref: input.challenge_ref,
          max_freshness_seconds: input.max_freshness_seconds,
        }));
      } catch {
        return fail('REVERIFICATION_PROVIDER_UNAVAILABLE');
      }

      if (!evidence || evidence.ok !== true) {
        return fail('REVERIFICATION_DENIED');
      }

      const evidenceProvider = typeof evidence.provider === 'string' ? evidence.provider.toLowerCase() : '';
      const evidenceMethod = typeof evidence.method_class === 'string' ? evidence.method_class.toUpperCase() : '';
      const evidenceIntentDigest = typeof evidence.bound_intent_digest === 'string'
        ? evidence.bound_intent_digest.toLowerCase()
        : '';

      if (
        evidenceProvider !== input.provider ||
        evidenceMethod !== input.requested_method_class ||
        evidence.evidence_ref !== input.evidence_ref ||
        evidence.principal !== input.principal ||
        evidenceIntentDigest !== input.intent_digest ||
        evidence.challenge_ref !== input.challenge_ref
      ) {
        return fail('REVERIFICATION_BINDING_MISMATCH');
      }

      if (evidence.replay_state !== 'UNCONSUMED') {
        return fail('REVERIFICATION_REPLAY_OR_CONFLICT');
      }

      if (
        !Number.isInteger(evidence.freshness_seconds) ||
        evidence.freshness_seconds < 0 ||
        evidence.freshness_seconds > input.max_freshness_seconds
      ) {
        return fail('REVERIFICATION_STALE');
      }

      return Object.freeze({
        ok: true,
        reason_code: 'REVERIFICATION_VERIFIED',
        provider: input.provider,
        method_class: input.requested_method_class,
        evidence_ref: input.evidence_ref,
        freshness_seconds: evidence.freshness_seconds,
        phishing_resistant: phishingResistantMethods.has(input.requested_method_class),
        execution_authority: false,
      });
    },
  });
}

module.exports = Object.freeze({
  createReverificationAdapter,
});
